import {Component, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {Category, Device, FireLoopRef, Message, Parser} from '../../shared/sdk/models';
import {CategoryApi, DeviceApi, MessageApi, ParserApi, RealTime} from '../../shared/sdk/services';

import {Subscription} from 'rxjs/Subscription';
import {DragulaService} from 'ng2-dragula';
import {Geoloc} from '../../shared/sdk/models/Geoloc';
import {AgmInfoWindow} from '@agm/core';


@Component({
  templateUrl: 'overview.component.html'
})
export class OverviewComponent implements OnInit,OnDestroy {

  @ViewChildren(AgmInfoWindow) agmInfoWindow: QueryList<AgmInfoWindow>;

  private message: Message = new Message();
  private device: Device = new Device();
  private parser: Parser = new Parser();
  private category: Category = new Category();

  private messageSub: Subscription;
  private deviceSub: Subscription;
  private parserSub: Subscription;
  private categorySub: Subscription;

  private messages: Message[] = new Array<Message>();
  private devices: Device[] = new Array<Device>();
  private parsers: Parser[] = new Array<Parser>();
  private categories: Category[] = new Array<Category>();

  private countMessages: number = 0;
  private countDevices: number = 0;
  private countParsers: number = 0;
  private countCategories: number = 0;

  private messageRef: FireLoopRef<Message>;
  private deviceRef: FireLoopRef<Device>;
  private parserRef: FireLoopRef<Parser>;
  private categoryRef: FireLoopRef<Category>;

  public data = [];

  private isCircleVisible: boolean[] = new Array<boolean>();

  private mapLat: number = 48.858093;
  private mapLng: number = 2.294694;
  private mapZoom: number = 2;

  private edit: boolean = false;

  constructor(private rt: RealTime,
              private messageApi: MessageApi,
              private deviceApi: DeviceApi,
              private parserApi: ParserApi,
              private categoryApi: CategoryApi,
              private dragulaService: DragulaService) {
    const bag: any = this.dragulaService.find('section-bag');
    if (bag !== undefined )
      this.dragulaService.destroy('section-bag');
    this.dragulaService.setOptions('section-bag', {
      moves: function (el, container, handle) {
        return handle.className === 'card-header drag';
      }
    });
    this.dragulaService.drag.subscribe((value) => {
      this.onDrag(value.slice(1));
    });
    this.dragulaService.drop.subscribe((value) => {
      this.onDrop(value.slice(1));
    });
    this.dragulaService.over.subscribe((value) => {
      this.onOver(value.slice(1));
    });
    this.dragulaService.out.subscribe((value) => {
      this.onOut(value.slice(1));
    });
  }

  private hasClass(el: any, name: string) {
    return new RegExp('(?:^|\\s+)' + name + '(?:\\s+|$)').test(el.className);
  }

  private addClass(el: any, name: string) {
    if (!this.hasClass(el, name)) {
      el.className = el.className ? [el.className, name].join(' ') : name;
    }
  }

  private removeClass(el: any, name: string) {
    if (this.hasClass(el, name)) {
      el.className = el.className.replace(new RegExp('(?:^|\\s+)' + name + '(?:\\s+|$)', 'g'), '');
    }
  }

  private onDrag(args) {
    let [e, el] = args;
    this.removeClass(e, 'ex-moved');
  }

  private onDrop(args) {
    let [e, el] = args;
    this.addClass(e, 'ex-moved');
  }

  private onOver(args) {
    let [e, el, container] = args;
    this.addClass(el, 'ex-over');
  }

  private onOut(args) {
    let [e, el, container] = args;
    this.removeClass(el, 'ex-over');
  }

  ngOnInit(): void {
    if (
      this.rt.connection.isConnected() &&
      this.rt.connection.authenticated
    ) {
      this.rt.onReady().subscribe(() => this.setup());
    } else {
      this.rt.onAuthenticated().subscribe(() => this.setup());
      this.rt.onReady().subscribe();
    }
  }

  setup(): void {
    console.log(this.rt.connection);
    this.ngOnDestroy();
    // Messages
    this.messageRef = this.rt.FireLoop.ref<Message>(Message);
    //console.log(this.organizations[0].id);
    this.messageSub = this.messageRef.on('change').subscribe(
      (messages: Message[]) => {
        this.data = messages;
        this.messages = messages;
        //console.log("Messages", this.messages);
        this.messageApi.count().subscribe(result => {
          //console.log(messageApi);
          //console.log("count: ", result);
          this.countMessages = result.count;
        });
      });

    // Devices
    this.deviceRef = this.rt.FireLoop.ref<Device>(Device);
    this.deviceRef.on('change',
      {limit: 10, order: 'updatedAt DESC', include: ['Parser', 'Category']}).subscribe(
      (devices: Device[]) => {
        this.devices = devices;
        //console.log("Devices", this.devices);
        this.deviceApi.count().subscribe(result => {
          //console.log(deviceApi);
          //console.log("count: ", result);
          this.countDevices = result.count;
        });
      });

    // Categories
    this.categoryRef = this.rt.FireLoop.ref<Category>(Category);
    this.categoryRef.on('change').subscribe(
      (categories: Category[]) => {
        this.categories = categories;
        //console.log("Categories", this.categories);
        this.categoryApi.count().subscribe(result => {
          //console.log(categoryApi);
          //console.log("count: ", result);
          this.countCategories = result.count;
        });
      });

    // Parsers
    this.parserRef = this.rt.FireLoop.ref<Parser>(Parser);
    this.parserRef.on('change').subscribe((parsers: Parser[]) => {
      this.parsers = parsers;
      //console.log("Parsers", this.parsers);
      this.parserApi.count().subscribe(result => {
        //console.log(parserApi);
        //console.log("count: ", result);
        this.countParsers = result.count;
      });
    });

  }

  ngOnDestroy(): void {
    console.log("Dashboard: ngOnDestroy");
    if (this.messageRef)this.messageRef.dispose();
    if (this.messageSub)this.messageSub.unsubscribe();

    if (this.deviceRef)this.deviceRef.dispose();
    if (this.deviceSub)this.deviceSub.unsubscribe();

    if (this.parserRef)this.parserRef.dispose();
    if (this.parserSub)this.parserSub.unsubscribe();

    if (this.categoryRef)this.categoryRef.dispose();
    if (this.categorySub)this.categorySub.unsubscribe();
  }


  create(): void {
    this.messageRef.create(this.message).subscribe(() => this.message = new Message());
  }

  update(message: Message): void {
    this.messageRef.upsert(message).subscribe();
  }

  remove(message: Message): void {
    this.messageRef.remove(message).subscribe();
  }

  setCircles() {
    for(let i = 0; i < this.devices.length; i++) {
      this.isCircleVisible.push(false);
    }
  }

  markerOut(i) {
    this.isCircleVisible[i] = false;
  }

  markerOver(i) {
    this.isCircleVisible[i] = true;
  }

  zoomOnDevice(elementId: string, geoloc: Geoloc): void {
    this.agmInfoWindow.forEach((child) => {
      // console.log(child['_el'].nativeElement.id);
      if (child['_el'].nativeElement.id === elementId)
        child.open();
      else
        child.close();
    });

    this.mapLat = geoloc.lat;
    this.mapLng = geoloc.lng;
    this.mapZoom = 12;
  }

}
