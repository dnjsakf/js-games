class PlayObject {
  constructor(props, state){
    const thisProps = this.flatObject(props) // Immutable
    const thisState = this.flatObject(Object.assign({}, state, props)); // Mutable
    const insts = {}

    this.freezeObject(thisProps);

    this.getProps = (key, defaultValue)=>((key ? thisProps[key] : thisProps)||defaultValue);
    this.getState = (key, defaultValue)=>((key ? thisState[key] : thisState)||defaultValue);

    this.getInsts = ()=>(insts);
    this.getInst = (key)=>(insts[key]);
    this.setInst = (key, value)=>(insts[key] = value);
  }

  setState(key, value){
    if( key ){
      const state = this.getState();
      if( Object instanceof key.constructor ){
        Object.assign(state, this.flatObject(key));
      } else {
        const oldValue = this.getState(key);
        if((value && Object instanceof value.constructor) &&
          ( !oldValue || Object instanceof oldValue.constructor) ){
            Object.assign(state, this.flatObject(Object.assign(oldValue||{}, value), key));
        }
        Object.assign(state, {[key]: value});
      }
    }
  }

  freezeObject(obj){
    if( obj && Object instanceof obj.constructor ){
      Object.freeze(obj);
      Object.keys(obj).forEach((key)=>(
        this.freezeObject(obj[key])
      ));
    }
    return obj;
  }

  // Make 1-Depth Object
  flatObject(obj, upKey){
    const temp = {}
    if( obj && Object instanceof obj.constructor ){
      Object.keys(obj).forEach((key)=>{
        const flatKey = (upKey ? upKey + "." : "") + key;
        const value = obj[key];
        if( value && Object instanceof value.constructor ){
          Object.assign(temp, this.flatObject(value, flatKey));
          temp[flatKey] = Object.assign({}, value);
        } else {
          temp[flatKey] = value;
        }
      });
    }
    return temp;
  }
}

class StageUtil {
  constructor(){
  }

  // 두 점 사이의 거리
  static getDistance(x1, y1, x2, y2){
    // 거리의 제곱 = 밑변의 제곱 + 높이의 제곱
    // 거리 = 루트(밑변의 제곱 + 높이의 제곱)
    return Math.sqrt(Math.pow((x2 - x1),2)+Math.pow((y2 - y1),2));
  }

  // 두 점 사이의 각도
  static getAngle(x1, y1, x2, y2, rotate){
    return (Math.atan2((y2 - y1), (x2 - x1)) * (180/Math.PI)) + (rotate||0);
  }

  // 사분면
  static getQuadrant(angle){
    if( Math.abs(angle) <= 90 ){
      if( angle >= 0 ){  // 4사분면
        return 4;
      } else { // 1사분면
        return 1;
      }
    } else if( Math.abs(angle) <= 180  ){ // 3사분면
      if( angle >= 0 ){  // 3사분면
        return 3;
      } else { // 2사분면
        return 2;
      }
    }
    return 0;
  }

  // 특정 각도로 특정 길이만큼 이동했을 때 좌표
  static getMovePos(range, angle, x1, y1){
    const vectorX = (range * Math.cos(angle*(Math.PI/180)));
    const vectorY = (range * Math.sin(angle*(Math.PI/180)));
    return {
      x: x1 + vectorX,
      y: y1 + vectorY,
      vectorX: vectorX,
      vectorY: vectorY,
      left: vectorX < 0,
      right: vectorX > 0,
      up: vectorY < 0,
      down: vectorY > 0,
    }
  }

  // 회전시키기
  static setRotate(rotate, width, x1, y1, x2, y2){
    const angle = StageUtil.getAngle(x1, y1, x2, y2, rotate); // 각도
    const dist = StageUtil.getDistance(x1, y1, x1+(width/2), y1+(width/2)); // 거리
    return {
      x: x1 + (dist * Math.cos((angle * Math.PI/180))),
      y: y1 + (dist * Math.sin((angle * Math.PI/180))),
    }
  }
}

class Drawer extends PlayObject {
  constructor(props){
    const defaultState = {
      zero: "normal",
      text: null,
      position: {
        x1: 0, y1: 0,
        x2: 0, y2: 0,
      },
      style: {
        shape: "rect",
        drawStyle: "fill",
        color: "#000000",
        textAlign: "top",
      },
      size: { 
        width: null,
        height: null,
        radius: null
      },
      guide: {
        show: false,
        size: 5,
        range: 100,
        visible: {
          radius: true,
          frontPoint: true,
          rangePoint: true,
          rangeRadius: true,
          rangeLine: true,
          destination: true,
        },
      },
    }
    super(props, defaultState);
  }

  #preDraw(ctx){
    ctx.beginPath();
  }

  #postDraw(ctx){
    const { drawStyle, color } = this.getState("style");

    if( drawStyle === "stroke" ){
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.closePath();
  }

  drawCircle(ctx, x1, y1, radius){
    this.#preDraw(ctx);
    ctx.arc(x1, y1, radius, 0, Math.PI * 2, 0);
    this.#postDraw(ctx);

    return { x1: x1, y1: y1 }
  }

  drawRectRotate(ctx, x1, y1, x2, y2, width, height){
    const p1 = StageUtil.setRotate(0, width, x1, y1, x2, y2);
    const p2 = StageUtil.setRotate(90, width, x1, y1, x2, y2);
    const p3 = StageUtil.setRotate(180, width, x1, y1, x2, y2);
    const p4 = StageUtil.setRotate(270, width, x1, y1, x2, y2);
    
    this.#preDraw(ctx);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    this.#postDraw(ctx);

    return {
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      x3: p3.x, y3: p3.y,
      x4: p4.x, y4: p4.y
    }
  }

  drawTriangleRotate(ctx, x1, y1, x2, y2, width, height){
    const p1 = StageUtil.setRotate(0, width, x1, y1, x2, y2);
    const p2 = StageUtil.setRotate(140, width, x1, y1, x2, y2);
    const p3 = StageUtil.setRotate(-140, width, x1, y1, x2, y2);

    this.#preDraw(ctx);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    this.#postDraw(ctx);

    return {
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      x3: p3.x, y3: p3.y
    }
  }

  drawText(ctx, text, x1, y1){
    ctx.beginPath();
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, x1, y1);
    ctx.closePath();
  }

  drawProgress(ctx, maxValue, val, x1, y1, width, height){
    let color = "green";
    let progress = (val/maxValue)*100;
    if( progress <= 0 ){
      progress = 0;
    } else if( progress < 25 ){
      color = "red";
    } else if( progress < 50 ){
      color = "yellow"
    } else {
      color = "green";
    }

    ctx.beginPath();
    ctx.rect(x1, y1, width*(progress/100), height);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath()
    ctx.rect(x1, y1, width, height);
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath()
    ctx.font = "6px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.fillText(progress+"%", x1+(width/2), y1+6);
    ctx.closePath();
  }

  drawGuide(ctx, size, range, x1, y1, x2, y2, radius, visible){
    const gudieAngle = StageUtil.getAngle(x1, y1, x2, y2);
    const {
      x:guidePosX,
      y:guidePosY
    } = StageUtil.getMovePos(range, gudieAngle, x1, y1);
    
    // 회전 반경
    if( visible.radius ){
      ctx.beginPath();
      ctx.moveTo(x1 - radius, y1);
      ctx.lineTo(x1 + radius, y1);  // 가로선
      ctx.moveTo(x1, y1 - radius);
      ctx.lineTo(x1, y1 + radius); // 세로선
      ctx.moveTo(x1, y1);
      ctx.arc(x1, y1, radius, 0, Math.PI * 2, 0);
      ctx.strokeStyle = "blue";
      ctx.stroke();
      ctx.closePath();
    }
    
    // 전면 Point 표시
    if( visible.frontPoint ){
      ctx.beginPath();
      ctx.arc(x2, y2, size, 0, Math.PI*2, 0);
      ctx.fillStyle = "blue";
      ctx.fill();
      ctx.closePath();
    }

    // 가이드 point 표시
    if( visible.rangePoint ){
      ctx.beginPath();
      ctx.arc(guidePosX, guidePosY, size, 0, Math.PI * 2, 0);
      ctx.fillStyle = "blue";
      ctx.fill();
      ctx.closePath();
    }

    // 가이드 범위 표시
    if( visible.rangeRadius ){
      ctx.beginPath();
      ctx.setLineDash([15,10]);
      ctx.arc(x1, y1, range, 0, Math.PI * 2, 0);
      ctx.strokeStyle = "red";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.closePath();
    }

    // 가이드 Line 표시
    if( visible.rangeLine ){
      ctx.beginPath();
      ctx.setLineDash([5,5]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(guidePosX, guidePosY);
      ctx.strokeStyle = "red";
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 목적지 Line 표시
    if( visible.destination ){
      ctx.beginPath();
      ctx.setLineDash([5,5]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "red";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.closePath();
    }
  }

  draw(data){
    const ctx = this.getProps("ctx");
    const { shape, textAlign } = this.getState("style");
    const { width, height, radius } = this.getState("size");
    let { x1, y1, x2, y2, x3, y3 } = this.getState("position");
    
    // 영점 조정
    switch(this.getState("zero")){
      case "middle":
        x1 += radius;
        y1 += radius;
        break;
      case "normal":
      default:
    }

    // 형태별 그리기
    switch(shape){
      case "cricle":
        const cricle = this.drawCircle(ctx, x1, y1, radius);
        x3 = cricle.x1;
        y3 = cricle.y1;
        break;
      case "rect":
        const rect = this.drawRectRotate(ctx, x1, y1, x2, y2, width, height);
        x3 = rect.x1;
        y3 = rect.y1;
        break;
      case "triangle":
        const triangle = this.drawTriangleRotate(ctx, x1, y1, x2, y2, width, height);
        x3 = triangle.x1;
        y3 = triangle.y1;
        break;
      case "progress":
        const progress = this.drawProgress(ctx, data.maxValue, data.value, x1-radius-10, y1-radius-13, width, 8);
        break;
    }
    
    // 가이드 라인
    const {
      show:guideShow,
      size:guideSize,
      range:guideRange,
      visible:guideVisible,
    } = this.getState("guide");
    if( guideShow ){
      this.drawGuide(ctx, guideSize, guideRange, x1, y1, x2, y2, radius, guideVisible);
    }
    
    // 텍스트 출력
    const text = this.getState("text");
    if( text ){
      let tPosX = x1;
      let tPosY = y1;
      switch(textAlign){
        case "left":
          tPosX -= (radius+20);
          break;
        case "top":
        default:
          tPosY -= (radius+20);
      }
      this.drawText(ctx, text, tPosX, tPosY);
    }
  }
}

class Player extends PlayObject {
  constructor(props){
    const defaultState = {
      name: "Unknown",
      health: 100,
      damage: 10,
      range: 500,
      moveDist: 5,
      follow: null,
      position: {
        current: { x: 0, y: 0 }, // 현재 좌표
        limit: { x: 0, y: 0, }, // 이동 제한 좌표
        range: { x: 0, y: 0 }, // 현재 바라보고 있는 좌표
      },
      scale: "middle", // [small, middle, large]
      style: {
        shape: "circle",
        color: "#000000",
        size: {
          width: 0,
          height: 0,
          radius: 0,
        },
        drawType: "fill",
      },
      guide: {
        show: false,
        size: 5,
        range: 500,
        visible: {
          radius: true,
          frontPoint: true,
          rangePoint: true,
          rangeRadius: true,
          rangeLine: true,
          destination: true,
        },
      },
      insts: {},
    }
    super(props, defaultState);
  }
  init(x, y){
    const ctx = this.getState("ctx");

    const name = this.getProps("name");
    const guide = this.getState("guide");
    const range = this.getState("range");
    const style = this.getState("style");
    
    const size = {
      width: 30,
      height: 30,
      radius: 15,
    }

    // Size 적용
    switch(style.scale){
      case "small":
        size.width = 15;
        size.height = 15;
        break;
      case "middle":
        size.width = 20;
        size.height = 20;
        break;
      case "large":
      default:
        size.width = 30;
        size.height = 30;
    }
    size.radius = size.width/2;
    this.setState("style.size", size);

    // Position 설정
    this.setState("position.current", {x, y});
    this.setState("position.limit", {
      x: ctx.canvas.width - (size.radius),
      y: ctx.canvas.height- (size.radius)
    });

    // Player Draw Instance
    this.setInst("playerDrawer", new Drawer({
      ctx: ctx,
      //text: name,
      size: size,
      style: {
        shape: style.shape,
        color: style.color,
        drawStyle: "fill",
      },
      guide: Object.assign({}, guide, { range: range }),
    }));

    // Health Gauge Draw Instance
    this.setInst("healthDrwer", new Drawer({
      ctx: ctx,
      style: {
        shape: "progress",
      },
      size: {
        width: size.width + 20,
        radius: size.radius,
      }
    }));

    // 그리기
    this.draw();
  }
  draw(){
    const playerPos = this.getState("position.current");
    const rangePos = this.getState("position.range");

    const playerDrawer = this.getInst("playerDrawer");
    playerDrawer.setState("position", {
      x1: playerPos.x,
      y1: playerPos.y,
      x2: rangePos.x, 
      y2: rangePos.y
    });
    playerDrawer.draw();
    
    const healthDrwer = this.getInst("healthDrwer");
    healthDrwer.setState("position", {
      x1: playerPos.x,
      y1: playerPos.y,
    });
    healthDrwer.draw({
      maxValue: 100,
      value: this.getState("health")
    });
  }
  hit(damage){
    const health = this.getState("health") - damage;
    const isDead = health <= 0;

    this.setState("health", isDead ? 0 : health);

    return isDead;
  }
  colision(x1, y1, radius){
    const hitBox = {
      x: this.getState("position.current.x"),
      y: this.getState("position.current.y"),
      size: this.getState("style.size.radius"),
    }
    if( StageUtil.getDistance(x1, y1, hitBox.x, hitBox.y) < (hitBox.size + (radius||0))){
      return true;
    }
    return false;
  }
}

function Player2(ctx, settings){
  // Player Configurations
  const config = {
    props: {
      _id: null,
    },
    state: {
      name: "Unknown",
      health: 100,
      damage: 10,
      range: 500,
      moveDist: 5,
      follow: null,
      position: {
        current: { x: 0, y: 0 }, // 현재 좌표
        limit: { x: 0, y: 0, }, // 이동 제한 좌표
        range: { x: 0, y: 0 }, // 현재 바라보고 있는 좌표
      },
      scale: "middle", // [small, middle, large]
      style: {
        shape: "circle",
        color: "#000000",
        size: {
          width: 0,
          height: 0,
          radius: 0,
        },
        drawType: "fill",
      },
      guide: {
        show: false,
        size: 5,
        range: 500,
        visible: {
          radius: true,
          frontPoint: true,
          rangePoint: true,
          rangeRadius: true,
          rangeLine: true,
          destination: true,
        },
      },
      insts: { },
    }
  };
  if( settings ){
    function _extends(src, tgt){
      Object.keys(tgt).forEach((key)=>{
        let value = tgt[key];
        if( !(value instanceof Array || value instanceof Player) && value instanceof Object ){
          _extends(src[key], value);
        } else {
          src[key] = value;
        }
      });
    }
    _extends(config, settings);
  }

  // Canvas Context
  this.getCtx = ()=>(ctx);
  // Config
  this.getConfig = (k)=>(config[k]);
  this.setConfig = (k,v)=>(config[k]=v);
  // Props
  this.getProps = (k)=>(config.props[k]);
  this.setProps = (k,v)=>(config.props[k]=v);

  // State
  this.getState = (k)=>(config.state[k]);
  this.setState = (k,v)=>(config.state[k]=v);
  // State:style
  this.getStyle = (k)=>(config.state.style[k]);
  this.setStyle = (k,v)=>(config.state.style[k]=v);
  // State:size
  this.getSize = (k)=>(config.state.style.size[k]);
  this.setSize = (k,v)=>{
    if( k === "width" ){
      config.state.style.size.width = v;
      config.state.style.size.radius = (v/2);
    } else {
      config.state.style.size[k] = v;
    }
  };
  // State:position
  this.getPos = (k)=>( k ? config.state.position.current[k] : config.state.position.current );
  this.setPos = (x,y)=>{
    if( x ){ config.state.position.current.x = x }
    if( y ){ config.state.position.current.y = y }
  };
  this.getLimitPos = ()=>(config.state.position.limit);
  this.setLimitPos = (x,y)=>{
    if( x ){ config.state.position.limit.x = x }
    if( y ){ config.state.position.limit.y = y }
  };
  this.getRangePos = ()=>(config.state.position.range);
  this.setRangePos = (x,y)=>{
    if( x ){ config.state.position.range.x = x }
    if( y ){ config.state.position.range.y = y }
  };
  // State:insts
  this.getInst = (k)=>(config.state.insts[k]);
  this.setInst = (k,v)=>(config.state.insts[k]=v);
}
Player.prototype = (()=>{
  // 초기값 설정
  const _init = (self, x, y)=>{
    const ctx = self.getCtx();

    const name = self.getProps("name");
    const guide = self.getProps("guide");
    
    const range = self.getState("range");
    const style = self.getState("style");
    
    const size = {
      width: 30,
      height: 30,
      radius: 15,
    }

    // Size 적용
    switch(style.scale){
      case "small":
        size.width = 15;
        size.height = 15;
        break;
      case "middle":
        size.width = 20;
        size.height = 20;
        break;
      case "large":
      default:
        size.width = 30;
        size.height = 30;
    }
    size.radius = size.width/2;

    // Position 설정
    self.setPos(x, y);
    self.setLimitPos(
      ctx.canvas.width - (size.width + size.radius),
      ctx.canvas.height- ( size.height  + size.radius)
    );
    self.setStyle("size", size);

    // Player Draw Instance
    self.setInst("playerDrawer", new Drawer({
      ctx: ctx,
      //text: name,
      size: size,
      style: {
        shape: style.shape,
        color: style.color,
        drawStyle: "fill",
      },
      guide: Object.assign({}, guide, { range: range }),
    }));

    // Health Gauge Draw Instance
    self.setInst("healthDrwer", new Drawer({
      ctx: ctx,
      style: {
        shape: "progress",
      },
      size: {
        width: size.width + 20,
        radius: size.radius,
      }
    }));

    // Player 그리기
    _draw(self);
  }
  // Player 그리기
  const _draw = (self)=>{
    const playerPos = self.getPos();
    const rangePos = self.getRangePos();

    const playerDrawer = self.getInst("playerDrawer");
    playerDrawer.setState("position", {
      x1: playerPos.x,
      y1: playerPos.y,
      x2: rangePos.x, 
      y2: rangePos.y
    });
    playerDrawer.draw();
    
    const healthDrwer = self.getInst("healthDrwer");
    healthDrwer.setState("position", {
      x1: playerPos.x,
      y1: playerPos.y,
    });
    healthDrwer.draw({
      maxValue: 100,
      value: self.getState("health")
    });
  }

  return {
    init(x,y){
      _init(this, x, y);
      return this;
    },
    draw(){
      _draw(this);
      return this;
    },
    hit(damage){
      const health = this.getState("health") - damage;
      const isDead = health <= 0;

      this.setState("health", isDead ? 0 : health);

      return isDead;
    },
    colision(x1, y1, radius){
      const hitBox = {
        x: this.getPos("x"),
        y: this.getPos("y"),
        size: this.getSize("radius"),
      }
      if( StageUtil.getDistance(x1, y1, hitBox.x, hitBox.y) < (hitBox.size + (radius||0))){
        return true;
      }
      return false;
    }
  }
})();

function Bullet(ctx, player, settings){
  const config = {
    ctx: ctx,
    player: player,
    props: {
    },
    state: {
      damage: 10,
      speed: 5,
      range: 200,
      isFired: false,
      size: {
        width: 8,
        height: 8,
        radius: 4,
      },
      position: {
        current: {
          x: 0, y: 0
        },
        destination: {
          x: 0, y: 0
        }
      },
      insts: {}
    }
  }
  if( settings ){
    function _extends(src, tgt){
      Object.keys(tgt).forEach((key)=>{
        let value = tgt[key];
        if( !(value instanceof Array || value instanceof Player) && value instanceof Object ){
          _extends(src[key], value);
        } else {
          src[key] = value;
        }
      });
    }
    _extends(config, settings);
  }
  // Canvas Context
  this.getCtx = ()=>(config.ctx);
  // Player
  this.getPlayer = ()=>(config.player);
  // Config
  this.getConfig = (k)=>(config[k]);
  this.setConfig = (k,v)=>(config[k]=v);
  // Props
  this.getProps = (k)=>(config.props[k]);
  this.setProps = (k,v)=>(config.props[k]=v);
  // State
  this.getState = (k)=>(config.state[k]);
  this.setState = (k,v)=>(config.state[k]=v);
  // State:size
  this.getSize = (k)=>(config.state.size[k]);
  this.setSize = (k,v)=>(config.state.size[k]=v);
  // State:position
  this.getPos = (k)=>( k ? config.state.position.current[k] : config.state.position.current );
  this.setPos = (x,y)=>{
    if( x ){ config.state.position.current.x = x }
    if( y ){ config.state.position.current.y = y }
  };
  this.getDestPos = (k)=>( k ? config.state.position.destination[k] : config.state.position.destination );
  this.setDestPos = (x,y)=>{
    if( x ){ config.state.position.destination.x = x }
    if( y ){ config.state.position.destination.y = y }
  };
  // State:insts
  this.getInst = (k)=>(config.state.insts[k]);
  this.setInst = (k,v)=>(config.state.insts[k]=v);
}
Bullet.prototype = (()=>{
  const _init = (self)=>{
  }

  const _draw = (self)=>{
    const ctx = self.getCtx();
    const pos = self.getPos();
    const radius = self.getSize("radius");

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2, 0);
    ctx.fillStyle = "green";
    ctx.fill();
    ctx.closePath();
  }

  const _fire = (self, x1, y1, x2, y2)=>{
    const angle = StageUtil.getAngle(x1, y1, x2, y2);
    const speed = self.getState("speed");
    const range = self.getState("range");
    const interval = setInterval(()=>{
      if( self.getState("isFired") ){
        const pos = self.getPos();
        const move = StageUtil.getMovePos(speed, angle, pos.x, pos.y);
        const isFired = (StageUtil.getDistance(x1, y1, move.x, move.y) < range);
        self.setPos(move.x, move.y);
        self.setState("isFired", isFired);
        return isFired;
      }
      self.setState("interval", null);
      clearInterval(interval);
    }, speed);

    self.setPos(x1, y1);
    self.setState("isFired", !!interval);
    self.setState("interval", interval);
  }

  return {
    init(){
      _init(this);
      return this;
    },
    draw(){
      _draw(this);
      return this;
    },
    fire(x1, y1, x2, y2){
      _fire(this, x1, y1, x2, y2);
      return this;
    },
    colision(x1, y1, radius){
      const hitBox = {
        x: this.getPos("x"),
        y: this.getPos("y"),
        size: this.getSize("radius"),
      }
      if( StageUtil.getDistance(x1, y1, hitBox.x, hitBox.y) < (hitBox.size + (radius||0))){
        this.setState("isFired", false);
        return true;
      }
      return false;
    }
  }
})();


function Spawn(canvas, settings){
  // 스폰 설정에 따라 생성되는 오브젝트의 크기, 
}


function StageManager(canvas, settings){
  const config = {
    props: {
      inputType: "wasd",
      size: {
        width: 500,
        height: 500,
      },
      insts: {
        canvas: canvas,
        root: document.body,
      },
      limit: {
        players: 500,
        bullets: 300
      },
    },
    state: {
      drawing: false,
      player: null,
      players: [],
      bullets: [],
      position: {
        pointer: {
          x: 0, y: 0
        }
      },
      keyPress: {
        pointer: false,
        keyboard: {}
      }
    }
  }
  if( settings ){
    function _extends(src, tgt){
      Object.keys(tgt).forEach((key)=>{
        let value = tgt[key];
        if( !(value instanceof Array) && value instanceof Object ){
          _extends(src[key], value);
        } else {
          src[key] = value;
        }
      });
    }
    _extends(config, settings);
  }

  // Config
  this.getConfig = (k)=>(config[k]);
  this.setConfig = (k,v)=>(config[k]=v);
  // Props
  this.getProps = (k)=>(config.props[k]);
  this.setProps = (k,v)=>(config.props[k]=v);
  // Props:size
  this.getSize = (k)=>(config.props.size[k]);
  this.setSize = (k,v)=>(config.props.size[k]=v);
  // Props:insts
  this.getInst = (k)=>(config.props.insts[k]);
  this.setInst = (k,v)=>(config.props.insts[k]=v);
  this.getRoot = ()=>(config.props.insts.root);
  this.getCanvas = ()=>(config.props.insts.canvas);
  this.setCanvas = (v)=>(config.props.insts.canvas=v);
  this.getCtx = ()=>(config.props.insts.ctx);
  this.setCtx = (v)=>(config.props.insts.ctx=v);
  // State
  this.getState = (k)=>(config.state[k]);
  this.setState = (k,v)=>(config.state[k] = v);
  // State:players
  this.getPlayer = ()=>(config.state.player);
  this.setPlayer = (v)=>(config.state.player=v);
  this.getPlayers = ()=>(config.state.players);
  this.setPlayers = (v)=>(config.state.players=v);
  this.addPlayers = (v)=>(config.state.players.push(v));
  this.cleanPlayers = ()=>(config.state.players = config.state.players.filter((o)=>(o)));
  // State:bullets
  this.getBullets = ()=>(config.state.bullets);
  this.setBullets = (v)=>(config.state.bullets=v);
  this.addBullets = (v)=>(config.state.bullets.push(v));
  this.cleanBullets = ()=>(config.state.bullets = config.state.bullets.filter((o)=>(o)));
  // State:position
  this.getPointerPos = ()=>(config.state.position.pointer);
  this.setPointerPos = (x,y)=>{
    if( x ){ config.state.position.pointer.x = x }
    if( y ){ config.state.position.pointer.y = y }
  };
  // State:keyPress.pointer
  this.pointerDown = ()=>(config.state.keyPress.pointer=true);
  this.pointerUp = ()=>(config.state.keyPress.pointer=false);
  this.pointerPressed = ()=>(config.state.keyPress.pointer);
  // State:keyPress.keyboard
  const keyboard = config.state.keyPress.keyboard;
  this.keyboardPressed = (k)=>( k ? k in config.state.keyPress.keyboard : Object.keys(config.state.keyPress.keyboard).length > 0 );
  this.keyboardDown = (k)=>(config.state.keyPress.keyboard[k]=true);
  this.keyboardUp = (k)=>(delete config.state.keyPress.keyboard[k]);
  this.getPressKeys = ()=>(config.state.keyPress.keyboard);

  // Keyboard Codes
  this.getKeyCode = (k)=>{
    const KEYCODE = {
      "ARROW_LEFT": 37,
      "ARROW_UP": 38,
      "ARROW_RIGHT": 39,
      "ARROW_DOWN": 40,
      "A": 65,
      "W": 87,
      "D": 68,
      "S": 83,
      "SPACE": 32,
      "F": 70,
    }
    switch(k||config.props.inputType){
      case "arrow":
        return {
          "LEFT": KEYCODE.ARROW_LEFT,
          "UP": KEYCODE.ARROW_UP,
          "RIGHT": KEYCODE.ARROW_RIGHT,
          "DOWN": KEYCODE.ARROW_DOWN,
          "SPACE": KEYCODE.SPACE
        }
        break;
      case "wasd":
      default:
        return {
          "LEFT": KEYCODE.A,
          "UP": KEYCODE.W,
          "RIGHT": KEYCODE.D,
          "DOWN": KEYCODE.S,
          "SPACE": KEYCODE.F
        }
    }
  }
}
StageManager.prototype = (()=>{
  const _init = (self, width, height) => {
    // Canvas 초기 설정
    _initCanavs(self, width, height);
    // Event 바인딩
    _bindEvent(self);
  }

  /**
   * 이벤트 바인딩
   * - keyDown: 키 입력 중
   * - keyUp: 키 입력 완료
   * - mousedown, touchstart: 포인터 입력 중
   * - mouseup, touchend: 포인터 입력 완료
   * - mousemove, touchemove: 포인터 이동
   */
  const _bindEvent = (self)=>{
    self.getRoot().addEventListener("keydown", (e)=>{ self.keyboardDown(e.keyCode); });
    self.getRoot().addEventListener("keyup", (e)=>{ self.keyboardUp(e.keyCode); });
    
    self.getRoot().addEventListener("mousedown", (e)=>{
      self.setPointerPos(e.offsetX, e.offsetY);
      self.pointerDown();
    });
    self.getRoot().addEventListener("mouseup", (e)=>{ self.pointerUp(); });
    self.getRoot().addEventListener("mousemove", (e)=>{ self.setPointerPos(e.offsetX, e.offsetY); });

    self.getRoot().addEventListener("touchstart", (e)=>{ 
      self.setPointerPos(
        e.touches[0].clientX - self.getCanvas().offsetLeft,
        e.touches[0].clientY - self.getCanvas().offsetTop
      );
      self.pointerDown();
    });
    self.getRoot().addEventListener("touchend", (e)=>{ self.pointerUp(); });
    self.getRoot().addEventListener("touchmove", (e)=>{ 
      self.setPointerPos(
        e.touches[0].clientX - self.getCanvas().offsetLeft,
        e.touches[0].clientY - self.getCanvas().offsetTop
      );
    });
  }
  
  // Canvas 설정
  const _initCanavs = (self, width, height)=>{
    const canvas = self.getCanvas();

    canvas.width = width||self.getSize("width");
    canvas.height = height||self.getSize("height");

    self.setSize("width", canvas.width);
    self.setSize("height", canvas.height);

    self.setCtx(canvas.getContext("2d"));
  }

  // Main Player 생성
  const _initPlayer = (self)=>{
  }
  
  // Player 위치 갱신
  const _updatePos = (self, player)=>{
    // Canvas 정보
    const KEYCODE = self.getKeyCode();

    // Player 정보
    const playerMoveDist = player.getState("moveDist");
    const playerLimitPos = player.getState("position.limit");
    let playerPosX = player.getState("position.current.x");
    let playerPosY = player.getState("position.current.y");
    
    if( self.keyboardPressed(KEYCODE.RIGHT) ){ playerPosX += playerMoveDist; }
    if( self.keyboardPressed(KEYCODE.LEFT) ){ playerPosX -= playerMoveDist; }
    if( self.keyboardPressed(KEYCODE.DOWN) ){ playerPosY += playerMoveDist; }
    if( self.keyboardPressed(KEYCODE.UP) ){ playerPosY -= playerMoveDist; }

    // 좌표 최소/최대 설정
    if( playerPosX <= 0 ){ playerPosX = 0; }
    if( playerPosY <= 0 ){ playerPosY = 0; }
    if( playerPosX > playerLimitPos.x ){ playerPosX = playerLimitPos.x; }
    if( playerPosY > playerLimitPos.y ){ playerPosY = playerLimitPos.y; }

    //console.log([playerLimitPos.x, playerPosX], [playerLimitPos.y, playerPosY]);

    // 좌표로 설정
    player.setState("position.current", {
      x: playerPosX,
      y: playerPosY
    });
  }

  // Player Pointer Pos
  const _updatePointer = (self, player)=>{
    // 이동거리
    const pointerPos = self.getPointerPos();
    const canvasWidth = self.getSize("width");
    const canvasHeight = self.getSize("height");

    // Player 정보
    const playerMoveDist = player.getState("moveDist");
    const playerLimitPos = player.getState("position.limit");
    let playerPosX = player.getState("position.current.x");
    let playerPosY = player.getState("position.current.y");

    // 조준점 좌표
    const rangePos = player.getState("position.range");
    const rangeAngle = StageUtil.getAngle(playerPosX, playerPosY, rangePos.x, rangePos.y);
    const rangeMovePos = StageUtil.getMovePos(playerMoveDist, rangeAngle, playerPosX, playerPosY);

    // 마우스,터치 입력 상태에 따른 좌표값 설정
    if( self.pointerPressed() ){
      // 조준 범위 바깥에만 클릭 가능(왼쪽, 오른쪽)
      if(( rangeMovePos.left && rangePos.x - playerMoveDist > pointerPos.x )|| // range > pointer
         ( rangeMovePos.right && rangePos.x + playerMoveDist < pointerPos.x ))  // range < pointer
        {
        playerPosX += rangeMovePos.vectorX;
      }
      // 조준 범위 바깥에만 클릭 가능(위쪽, 아래쪽)
      if(( rangeMovePos.up && rangePos.y - playerMoveDist > pointerPos.y )|| // range < pointer
         ( rangeMovePos.down && rangePos.y + playerMoveDist < pointerPos.y ))  // range > pointer
        {
        playerPosY += rangeMovePos.vectorY;
      }
    }

    // 좌표 최소/최대 설정
    if( playerPosX < 0 ){ playerPosX = 0; }
    if( playerPosY < 0 ){ playerPosY = 0; }
    if( playerPosX > playerLimitPos.x ){ playerPosX = playerLimitPos.x; }
    if( playerPosY > playerLimitPos.y ){ playerPosY = playerLimitPos.y; }

    // 좌표로 설정
    player.setState("position.current", {
      x: playerPosX,
      y: playerPosY
    });
  }

  // 조준점 좌표 갱신
  const _updateAim = (self, player)=>{
    // 좌표
    const pointerPos = self.getPointerPos();

    // Player 정보
    const playerPos = player.getState("position.current");
    const palyerRange = player.getState("range");

    // 조준점 좌표
    const rangeAngle = StageUtil.getAngle(playerPos.x, playerPos.y, pointerPos.x, pointerPos.y);
    const rangeMovePos = StageUtil.getMovePos(palyerRange, rangeAngle, playerPos.x, playerPos.y);

    // 조준점 좌표 설정
    player.setState("position.range", {
      x: rangeMovePos.x,
      y: rangeMovePos.y
    });
  }

  // Target 따라가기
  const _followTarget = (self, player, target)=>{
    // Player 좌표
    const playerPos = player.getState("position.current");
    const playerMoveDist = player.getState("moveDist");

    // Target 정보
    const targetPos = ( target instanceof Player ? target.getState("position.current") : self.getPointerPos() );
    const targetAngle = StageUtil.getAngle(playerPos.x, playerPos.y, targetPos.x, targetPos.y);
    const targetMovePos = StageUtil.getMovePos(playerMoveDist, targetAngle, playerPos.x, playerPos.y);

    // 좌표 설정
    player.setState("position.current", {
      x: targetMovePos.x,
      y: targetMovePos.y,
    });
    player.setState("position.range", {
      x: targetPos.x,
      y: targetPos.y
    });
  }

  // 총알 생성
  const _updateBullet = (self, player)=>{
      
    // 입력 키에 따른 좌표값 설정
    const KEYCODE = self.getKeyCode();
    
    // 좌표
    const playerPos = player.getState("position.current");
    const playerRangePos = player.getState("position.range");

    // Space 입력
    // if( self.keyboardPressed(KEYCODE.SPACE) ){
    if( self.pointerPressed() ){
      const bullet = new Bullet(
        self.getCtx(),
        player, 
        {
          state: {
            range: player.getState("position.range"),
          }
        }
      );
      bullet.init();
      bullet.fire(playerPos.x, playerPos.y, playerRangePos.x, playerRangePos.y);

      self.addBullets(bullet);

      return bullet;
    }
    return null;
  }

  // Stage 그리기
  const _drawStage = (self)=>{
    const ctx = self.getCtx();
    const width = self.getSize("width");
    const height = self.getSize("height");
    const pointerPos = self.getPointerPos();

    // Background 그리기
    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.rect(0, 0, width, height);
    ctx.stroke();
    ctx.closePath();
    
    // Pointer 그리기
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.setLineDash([]);
    ctx.moveTo(pointerPos.x, pointerPos.y);
    ctx.arc(pointerPos.x, pointerPos.y, 5, 0, Math.PI*2, 0);
    ctx.fill();
    ctx.closePath();
  }

  // Player 그리기
  const _drawPlayer = (self)=>{
    const player = self.getPlayer();
    _updateBullet(self, player);  // 총알 발사
    _updatePos(self, player);     // 위치 갱신
    _updateAim(self, player);     // 조준점 갱신
    //_updatePointer(self, player); // 포인터 갱신
    player.draw();
  }

  // Player 그리기
  const _drawPlayers = (self)=>{
    const firedBullets = self.getBullets().filter((bullet)=>(bullet.getState("isFired")));
    const players = self.getPlayers();

    for(let idx=0; idx<players.length; idx++){
      const player = players[idx];
      const playerPos = player.getState("position.current");
      const playerSize = player.getState("style.size.radius");
      const playerDamage = player.getState("damage");

      // Bullet 충돌감지
      for(let bulletIndex=0; bulletIndex < firedBullets.length; bulletIndex++){
        const bullet = firedBullets[bulletIndex];
        const bulletPos = bullet.getPos();
        const bulletSize = bullet.getSize("radius");
        const bulletDamage = bullet.getState("damage") + ( Math.random()*30 > 25 ? 100 : 0 );

        if( player.colision(bulletPos.x, bulletPos.y, bulletSize) ){
          const isDead = player.hit(bulletDamage); 
          if( isDead ){
            //delete players[idx];
            break;
          }
        }
      }

      const follow = player.getState("follow");
      if( follow instanceof Player ) {
        // Target 따라가기
        _followTarget(self, player, follow);

        const followPos = follow.getState("position.current");
        const followSize = follow.getState("style.size.radius");
        const followDamage = follow.getState("damage");

        // Target 충돌감지
        if( follow.colision(playerPos.x, playerPos.y, playerSize) ){
          const isDead = player.hit(followDamage);
          if( isDead ){
            //delete players[idx];
          }
          follow.hit(playerDamage);
        }
      }
      // player 그리기
      player.draw();
    }
    self.cleanPlayers();
  }

  // 총알 그리기
  const _drawBullets = (self)=>{
    const bullets = self.getBullets();
    for(let idx=0; idx < bullets.length; idx++){
      const bullet = bullets[idx];
      if( bullet && bullet.getState("isFired") ){
        bullet.draw();
      } else {
        delete bullets[idx];
      }
    }
    self.cleanBullets();
  }

  // Canvas 초기화
  const _clearCanvas = (self)=>{
    const width = self.getSize("width");
    const height = self.getSize("height");
    self.getCtx().clearRect(0, 0, width, height);
  }

  // Canvas 그리기 이벤트
  const _draw = (self)=>{
    // Canvas 그리기 서브 이벤트(재귀호출)
    function drawer(){
      _clearCanvas(self); // Canvas 초기화
      _drawStage(self); // Stage 그리기
      _drawPlayer(self); // Player 그리기
      _drawPlayers(self); // Players 그리기
      _drawBullets(self); // Bullets 그리기

      // 현재 상태 저장
      self.setState("drawing", requestAnimationFrame(drawer));
    }
    // 이미 그리는 중인 경우 중단
    cancelAnimationFrame(self.getState("drawing"));
    self.setState("drawing", null);
    
    // 그리기 시작
    drawer();
  }

  // 시작 이벤트
  const _start = (self)=>{
    const isDrawing = self.getState("drawing");
    if( !isDrawing ){
      _draw(self);
    }
  }

  // 중단 이벤트
  const _stop = async (self)=>{
    const drawing = self.getState("drawing");
    if( drawing ){
      await cancelAnimationFrame(drawing);
      self.setState("drawing", null);
    }
  }

  // 종료 이벤트
  const _destroy = async (self)=>{
    await _stop(self);
    await _clearCanvas(self);
  }
  
  return {
    init(width, height){
      _init(this, width, height);
      return this;
    },
    start(){
      _start(this);
    },
    stop(){
      _stop(this);
    },
    destroy(){
      _destroy(this);
    }
  }
})();
