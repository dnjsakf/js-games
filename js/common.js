/******************************************
 * Temps
 ******************************************/
class Job { }
class Adventurer extends Job { }
class Warrior extends Job { }
class Item { }


/******************************************
 * Utils
 ******************************************/
class StateObject {
  constructor(obj={}){
    this.value = obj;
  }

  getValue(key, df){
    let retval = null;
    const obj = this.value;
    if( key && obj && Object instanceof obj.constructor ){
      const splited = key?.split(".");
      if( splited?.length > 1 ){
        retval = splited.reduce((prev, crnt, idx)=>{
          const prevObj = ( idx === 1 ? obj[prev] : prev );
          return prevObj[crnt];
        });
      } else {
        retval = obj[key];
      }
    } else {
      retval = obj;
    }
    if( retval === undefined || retval === null ){
      retval = df;
    }
    return retval;
  }

  setValue(key, value){
    const obj = this.value;
    if( key ){
      if( Object instanceof obj?.constructor ){
        if( typeof key === "string" ){
          const splited = key.split(".");
          if( splited.length > 1 ){
            const lastKey = splited[splited.length - 1];
            splited.reduce((prev, crnt, idx)=>{
              const prevObj = ( idx === 1 ? obj[prev] : prev );
              if( crnt === lastKey ){
                prevObj[crnt] = value;
              }
              return prevObj[crnt];
            });
          } else {
            obj[key] = value;
          }
        } else if( Object instanceof key?.constructor ){
          Object.assign(obj, key);
        } else {
          // Not Found Key
        }
      } else {
        this.value = key;
      }
    }
  }
}

class StateUtil {
  constructor(props, state){
    const _props = new StateObject(Object.assign({}, props));
    const _state = new StateObject(Object.assign({}, state));

    this.getProps = (...args) => ( _props.getValue(...args) );
    this.getState = (...args) => ( _state.getValue(...args) );
    this.setProps = (...args) => ( _props.setValue(...args) );
    this.setState = (...args) => ( _state.setValue(...args) );

    this.freeze(_props.getValue());
  }

  get props(){
    return this.getProps();
  }
  get state(){
    return this.getState();
  }

  freeze(obj){
    if( obj && Object instanceof obj.constructor ){
      Object.freeze(obj);
      Object.keys(obj).forEach((key)=>(
        this.freeze(obj[key])
      ));
    }
    return obj;
  }

  static genUuid(size, prefix){
    const codes = ((new Array(10).fill(0).map((code, idx)=>(code+idx)).join("")) // Numbers
    + (new Array(26).fill(97).map((code, idx)=>(String.fromCharCode(code+idx))).join("") // Uppers
    + (new Array(26).fill(65).map((code, idx)=>(String.fromCharCode(code+idx))).join("")))); // Lowers

    if( !size || size <= 0 ){
      size = 32;
    }
    if( typeof prefix === "string" ){
      size -= (prefix.length);
      if( size <= 0 ){
        size = 0;
      }
      if( prefix.length > size ){
        prefix = prefix.substring(0, size);
      }
    } else {
      prefix = "";
    }
    const uuid = new Array(size).fill(0).map((code, idx)=>{
      const rnd = parseInt(Math.random(codes.length)*codes.length);
      return codes[rnd];
    }).join("");

    return prefix+uuid;
  }
}

class DrawUtil {
  constructor(ctx){
    this.ctx = ctx;
  }

  rect(x1, y1, width, height, style){
    const { type, color, text, textColor } = style;
    this.ctx.beginPath();
    this.ctx.rect(x1, y1, width, height);
    if( type === "stroke" ){
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = color; 
      this.ctx.fill();
    }
    if( text ){
      // const fontSize = ( width / 2 );
      const fontSize = ( width / 3 );
      this.ctx.font = `${fontSize}px Arial`;
      this.ctx.textAlign = "center";
      if( textColor ){
        this.ctx.fillStyle = textColor;
      } else if( color ){
        this.ctx.fillStyle = color;
      } else {
        this.ctx.fillStyle = "#000000";
      }
      this.ctx.fillText(text, x1+(width/2), y1+(height/2)+(fontSize/3));
    }
    this.ctx.closePath();
  }

  circle(x1, y1, radius, style){
    const { type, color } = style;
    this.ctx.beginPath();
    // this.ctx.arc(x1+radius, y1+radius, radius, 0, Math.PI * 2, 0);
    this.ctx.arc(x1, y1, radius, 0, Math.PI * 2, 0);
    if( type === "stroke" ){
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = color; 
      this.ctx.fill();
    }
    this.ctx.closePath();
  }

  strokeRect(x1, y1, width, height, style){
    style = Object.assign({}, style, { type: "stroke" });
    this.rect(x1, y1, width, height, style);
  }

  strokeCircle(x1, y1, radius, style){
    style = Object.assign({}, style, { type: "stroke" });
    this.circle(x1, y1, radius, style);
  }

  fillRect(x1, y1, width, height, style){
    style = Object.assign({}, style, { type: "fill" });
    this.rect(x1, y1, width, height, style);
  }

  fillCircle(x1, y1, radius, style){
    style = Object.assign({}, style, { type: "fill" });
    this.circle(x1, y1, radius, style);
  }
}


/******************************************
 * Player
 ******************************************/
class Player extends StateUtil {
  constructor(props={}){
    super({
      uuid: StateUtil.genUuid(32, "PLAYER_"),
      username: "Temp",
      ...props,
    }, {
      stat: {
        level: 1,
        exp: 0,
        health: 100,
        strength: 10,
        limit: {
          exp: 100,
        },
        point: 100,
      },
      inventory: [],
      equipment: {
        weapon: null,
        armour: null,
        accessory: null,
        potion: null,
      },
      offset: {
        x: 0,
        y: 0,
      },
      aim: {
        vector: "UP",
        pos: { x: 0, y: 0 },
        offset: { x: 0, y: 0 }, 
        size: { width: 5, height: 5 },
      },
      field: null, // Field Object
      settings: {
        maxLevel: 30,
      },
    });
  }

  setOffset(x, y){
    this.setState("offset", { x, y });
  }

  setField(field){
    this.setState("field", field);
    if( field instanceof Field ){
      field.standOn(this);
    }
  }

  get target(){
    const vector = this.state.aim.vector;
    const targetField = this.state.field.state.link[vector];
    return targetField;
  }

  init(){}

  attack(target){
    if( !target ){
      target = this.target.state.stand;
    }
    let isKilled = false;
    if( target instanceof Player ){
      const damage = this.getState("stat.strength");
      if( typeof target.hitted === 'function' ){
        isKilled = target.hitted(damage);
      }
    }
    if( isKilled ){
      const { point } = target.state.stat;
      console.log(point);
    }
    console.log("attack", target, isKilled);
    return isKilled;
  }

  hitted(damage=0, target){
    console.log("hitted", damage);
    let isDead = false;
    let health = this.getState("stat.health");
    let armour = this.getState("equipment.armour", 0);
    if( armour > 0 ){ damage -= armour; }
    if( damage > 0 ){ health -= damage; }
    if( health <= 0 ){ health = 0; isDead = true; }
    
    this.setState("stat.health", health);

    if( isDead ){
      this.died();
    }
    return isDead;
  }

  died(){
    const field = this.state.field;
    if( field instanceof Field ){
      field.leave();
    }
    this.setState("stat.health", 0);
    return true;
  }

  levelUp(){
    this.setState("stat.level", this.state.level + 1);
  }

  incExp(){}

  rotate(vector="UP"){
    const field = this.state.field;
    if( field instanceof Field ){
      const aimPos = this.getState("aim.pos", { x: 0, y: 0 });

      const { p1 } = field.state.pos;
      const { width, height } = field.state.size;

      const widthRadius = parseInt(width/2);
      const heightRadius = parseInt(height/2);

      switch(vector){
        case "UP":
          aimPos.x = ( p1.x + widthRadius );
          aimPos.y = ( p1.y );
          break;
        case "DOWN":
          aimPos.x = ( p1.x + widthRadius );
          aimPos.y = ( p1.y + height );
          break;
        case "LEFT":
          aimPos.x = ( p1.x );
          aimPos.y = ( p1.y + heightRadius );
          break;
        case "RIGHT":
          aimPos.x = ( p1.x + width );
          aimPos.y = ( p1.y + heightRadius );
          break;
      }
      this.setState("aim.pos", aimPos);
    }
    this.setState("aim.vector", vector);
  }

  move(vector="UP"){}
}

class User extends Player {
  constructor(props={}){
    super({
      ...props,
      type: "user",
    });
  }

  move(vector="UP"){
    const crntField = this.state.field;
    const nextField = crntField.state.link[vector];
    if( nextField instanceof Wall ) {
      this.rotate(vector);
      return false;
    } else if( nextField instanceof Field ){
      const nextFieldHasStand = nextField.state.stand;
      if( nextFieldHasStand ){
        return false;
      }

      const { x, y } = nextField.state.offset;
      this.setState("field", nextField);
      this.setState("offset", { x, y });

      crntField.leave();
      nextField.standOn(this);
    }
    
    this.rotate(vector);

    return true;
  }
}

class Enermy extends Player {
  constructor(props={}){
    super({
      ...props,
      type: "enermy",
    }, {
      target: null, // User Object
    });
  }

  move(){
    const target = this.state.target;
    if( target instanceof User ){
      const field = this.state.field;
      const userField = target.getState("field");

    }
  }
}


/******************************************
 * Field
 ******************************************/
class Field extends StateUtil {
  constructor(props={}){
    const width = (props.size?.width || 50);
    const height = (props.size?.height || 50);
    const state = Object.assign({}, {
      type: ( props.type || "init" ), // init, spawn, road, wall, goal
      index: ( props.index || 0 ),
      size: {
        width: width,
        height: height,
      },
      pos: {
        p1: { x:  0, y:  0 },
        p2: { x: width, y:  0 },
        p3: { x: width, y: height },
        p4: { x:  0, y: height },
      },
      offset: {
        x: 0,
        y: 0,
        ...props.offset,
      },
      link: {
        UP: null,
        DOWN: null,
        LEFT: null,
        RIGHT: null,
      },
      stand: null,
      settings: {
        adjustPos: {
          x: 0,
          y: 0,
        },
        showNumber: true,
      },
    });
    super(props, state);
  }

  setPos(p1, p2, p3, p4){
    this.setState("pos", { p1, p2, p3, p4 });
  }

  setOffset(x, y){
    this.setState("offset", { x, y });
  }

  setLink(UP, DOWN, LEFT, RIGHT){
    this.setState("link", { UP, DOWN, LEFT, RIGHT });
  }

  standOn(target){
    this.setState("stand", target);
  }

  leave(){
    this.setState("stand", null);
  }

  get type(){
    return this.getProps("type", "init");
  }
}

class Road extends Field {
  constructor(props={}){
    super({
      ...props,
      type: "road",
    });
  }
}

class Spawn extends Field {
  constructor(props={}){
    super({
      ...props,
      type: "spawn",
    });
  }
}

class Wall extends Field {
  constructor(props={}){
    super({
      ...props,
      type: "wall",
    });
  }
}

class Goal extends Field {
  constructor(props={}){
    super({
      ...props,
      type: "goal",
    });
  }
}

class Portal extends Field {
  constructor(props={}){
    super({
      ...props,
      type: "portal",
    });
  }
}


/******************************************
 * Ctronller
 ******************************************/
class Controller extends StateUtil {

  constructor(props={}){
    super({
      mode: "wasd",
      ...props,
    }, {
      events: [],
    });

    this.keymap = {
      "arrow": {
        "ARROW_LEFT": 37,
        "ARROW_UP": 38,
        "ARROW_RIGHT": 39,
        "ARROW_DOWN": 40,
      },
      "wasd": {
        "A": 65,
        "W": 87,
        "D": 68,
        "S": 83,
      },
      "action": {
        "SPACE": 32,
        "F": 70,
      },
    }
  }

  init(){
    this.bindEvents();
  }

  bindEvents(){
    this.unbindEvents();

    const events = [];
    const { onKeyDown } = this.props;
    if( typeof onKeyDown === 'function' ){
      window.controllerHandler = (e) => {
        const vector = this.compare(e.keyCode);
        onKeyDown(e, vector, {
          LEFT: vector === "LEFT",
          UP: vector === "UP",
          RIGHT: vector === "RIGHT",
          DOWN: vector === "DOWN",
          ACTION: vector === "ACTION",
        });
      };
      events.push({
        event: "keydown",
        handler: window.controllerHandler,
        target: document,
        beforeUnbind: ()=>{
          return true;
        },
        onUnbind: ()=>{
          window.controllerHandler = null;
        },
      });
    }

    events?.forEach(({ event, handler, target, onBind, beforeBind })=>{
      let doBind = true;
      if( typeof beforeBind === 'function' ){
        doBind = !(beforeBind() === false);
      }
      if( doBind ){
        target.addEventListener(event, handler);
        if( typeof onBind === 'function' ){
          onBind();
        }
      }
    });

    this.setState("events", events);
  }

  unbindEvents(){
    const events = this.state.events;
    events?.forEach(({ event, handler, target, onUnbind, beforeUnbind })=>{
      let doUnbind = true;
      if( typeof beforeUnbind === 'function' ){
        doUnbind = !(beforeUnbind() === false);
      }
      if( doUnbind ){
        target.removeEventListener(event, handler);
        if( typeof onUnbind === 'function' ){
          onUnbind();
        }
      }
    });

    this.setState("events", []);
  }
  
  getKeyMap(){
    const { mode } = this.props;
    const KEYCODE_MOVE = this.keymap[mode];
    const KEYCODE_ACTION = this.keymap["action"];
    switch( mode ){
      case "arrow":
        return {
          "LEFT": KEYCODE_MOVE.ARROW_LEFT,
          "UP": KEYCODE_MOVE.ARROW_UP,
          "RIGHT": KEYCODE_MOVE.ARROW_RIGHT,
          "DOWN": KEYCODE_MOVE.ARROW_DOWN,
          "ACTION": KEYCODE_ACTION.SPACE,
        }
      case "wasd":
      default:
        return {
          "LEFT": KEYCODE_MOVE.A,
          "UP": KEYCODE_MOVE.W,
          "RIGHT": KEYCODE_MOVE.D,
          "DOWN": KEYCODE_MOVE.S,
          "ACTION": KEYCODE_ACTION.F,
        }
    }
  }

  compare(code){
    const KEYMAP = this.getKeyMap();
    switch(code){
      case KEYMAP.UP: return "UP";
      case KEYMAP.LEFT: return "LEFT";
      case KEYMAP.RIGHT: return "RIGHT";
      case KEYMAP.DOWN: return "DOWN";
      case KEYMAP.ACTION: return "ACTION";
      default: return "UNKNOWN";
    }
  }
}

/******************************************
 * Stage
 ******************************************/
class Stage extends StateUtil {
  constructor(props={}){
    const state = Object.assign({}, {
      insts: {
        canvas: props.canvas,
        roads: [],
        goals: [],
        walls: [],
        portals: [],
        spawners: [],
      },
      status: {
        level: 1,
        status: "init", // init, ready, running, complete, pause
        users: [],
        enermies: [],
        settings: {
          minEnermies: 3,
          maxEnermies: 5,
          minPlayers: 1,
          maxPlayers: 2,
        },
      },
      maps: {
        size: (props.size?.maps || [5, 5]),
        matrix: [],
        width: 0,
        height: 0,
      },
    });
    super(props, state);

    this.drawer = new DrawUtil(state.insts.canvas.getContext("2d"));
    this.getCanvas = () => ( state.insts.canvas );
    this.getContext = () => ( state.insts.canvas.getContext("2d") );
  }
  
  get matrix(){
    const matrix = this.getState("maps.matrix", []);
    if( matrix?.length > 1 ){
      return matrix.reduce((prev, crnt)=>([].concat(prev, crnt)));
    }
    return matrix;
  }
  
  init(){
    // -> Making Stage
    this.makeMatrix();
    this.makeMatrixLink();
    // <- Making Stage
    // -> Setting Canvas Size
    const { width, height } = this.getState("maps");
    const canvas = this.getCanvas();
    canvas.width = width;
    canvas.height = height;
    // <- Setting Canvas Size
    // -> Setting Player Offset
    const users = this.getProps("users", []);
    const spawners = this.getState("insts.spawners", []).slice();
    users?.forEach((user)=>{
      const spawn = spawners.shift();
      if( spawn ){
        const { x, y } = spawn.getState("offset");
        user.setField(spawn);
        user.setOffset(x, y);
        user.rotate("UP")
      }
    });
    // <- Setting Player Offset
    // -> Drawing Stage
    // this.drawMatrix();
    // this.drawPlayers();
    // <- Drawing Stage
  }

  makeMatrix(){
    const matrix = [];
    const roads = [];
    const goals = [];
    const walls = [];
    const portals = [];
    const spawners = [];

    const fieldSize = this.getProps("size.field");
    const goal = this.getProps("goal", []);
    const spawn = this.getProps("spawn", []);
    const wall = this.getProps("wall", []);
    const portal = this.getProps("portal", []);
    const [rows, cols] = this.getState("maps.size");

    let width = 0;
    let height = 0;
    let mIdx = 0;
    for(let rIdx=0; rIdx<rows; rIdx++){
      const colArr = [];
      for(let cIdx=0; cIdx<cols; cIdx++){
        const fieldConfig = {
          index: mIdx,
          offset: {
            x: cIdx,
            y: rIdx,
          },
          size: {
            width: fieldSize?.at(0),
            height: fieldSize?.at(1),
          },
        }
        let col = null;
        if( goal.some(([x, y])=>( x === cIdx && y === rIdx )) ){
          col = new Goal(fieldConfig);
          goals.push(col);
        } else if( spawn.some(([x, y])=>( x === cIdx && y === rIdx )) ){
          col = new Spawn(fieldConfig);
          spawners.push(col);
        } else if( wall.some(([x, y])=>( x === cIdx && y === rIdx )) ){
          col = new Wall(fieldConfig);
          walls.push(col);
        } else if( portal.some(([x, y])=>( x === cIdx && y === rIdx )) ){
          col = new Portal(fieldConfig);
          portals.push(col);
        } else {
          col = new Road(fieldConfig);
          roads.push(col);
        }
        const size = col.getState("size");
        // const adjustX = (colArr.length)+1;
        // const adjustY = (matrix.length)+1;
        const colWidth = (size.width);
        const colHeight = (size.height);

        const p1 = {
          x: (colWidth * cIdx),
          y: (colHeight * rIdx),
        }
        const p2 = {
          x: (colWidth * (cIdx+1)),
          y: (colHeight * rIdx),
        }
        const p3 = {
          x: (colWidth * (cIdx+1)),
          y: (colHeight * (rIdx+1)),
        }
        const p4 = {
          x: (colWidth * (cIdx)),
          y: (colHeight * (rIdx+1)),
        }

        col.setPos(p1, p2, p3, p4);
        colArr.push(col);

        mIdx += 1;
        
        if( rIdx === 0 ){
          width += colWidth;
        }
        if( cIdx === 0 ){
          height += colHeight;
        }
      }
      matrix.push(colArr);
    }

    this.setState("maps.matrix", matrix);
    this.setState("maps.width", width);
    this.setState("maps.height", height);

    this.setState("insts.spawners", spawners);
    this.setState("insts.goals", goals);
    this.setState("insts.walls", walls);
    this.setState("insts.roads", roads);
    
    return matrix;
  }

  makeMatrixLink(){
    // 각 Field 간의 연결 처리
    const matrix = this.makeMatrix();
    const [rows, cols] = this.getState("maps.size");
    const MAX_X = (cols - 1);
    const MAX_Y = (rows - 1);
    matrix.reduce((prev, crnt)=>([].concat(prev, crnt))).forEach((field)=>{
      const { x, y } = field.state.offset;

      let x1 = x;
      let y1 = y;
      
      let UP = null;
      let DOWN = null;
      let LEFT = null;
      let RIGHT = null;

      // -> LEFT
      if( x > 0 ){ // LEFT
        x1 = x - 1;
      } else if ( field instanceof Portal ){
        x1 = MAX_X;
      }
      LEFT = matrix[y][x1];
      // <- LEFT
      // -> RIGHT
      if( x < MAX_X ){
        x1 = x + 1;
      } else if ( field instanceof Portal ){
        x1 = 0
      }
      RIGHT = matrix[y][x1];
      // <- RIGHT
      // -> UP
      if( y > 0 ){ // UP
        y1 = y - 1;
      } else if ( field instanceof Portal ){
        y1 = MAX_Y;
      }
      UP = matrix[y1][x];
      // <- UP
      // -> DOWN
      if( y < MAX_Y ){ // DOWN
        y1 = y + 1;
      } else if ( field instanceof Portal ){
        y1 = 0;
      }
      DOWN = matrix[y1][x];
      // <- DOWN

      field.setLink(UP, DOWN, LEFT, RIGHT);
    });
  }

  drawMatrix(){
    const matrix = this.makeMatrix();
    matrix.reduce((prev, crnt)=>([].concat(prev, crnt))).forEach((field)=>{
      const type = field.getProps("type");
      const index = field.getState("index");
      const { width, height } = field.getState("size");
      const { p1, p2, p3, p4 } = field.getState("pos");
      const { x, y } = field.getState("offset");
      const { showNumber } = field.getState("settings");

      const style = {
        type: "stroke",
        color: "#0000ff",
        text: null,
        textColor: null,
      }

      if( type === "goal" ){ // field instanceof Goal
        style.type = "fill";
        style.color = "#ffff00";
      } else if( type === "spawn" ){ // field instanceof Spawn
        style.type = "fill";
        style.color = "#cccccc";
      } else if( type === "portal" ){ // field instanceof Portal
        style.type = "fill";
        style.color = "#ff00ff";
      } else if( type === "wall" ){ // field instanceof Wall
        style.type = "fill";
        style.color = "#333333";
      } else { // field instanceof Road
        // style.color = "#0000ff";
        style.color = "#bbbbbb";
      }

      if( showNumber ){
        // style.text = String(index);
        style.text = String(`(${x},${y})`)
      }

      this.drawer.rect(p1.x, p1.y, width, height, style);
    });
  }

  drawPlayers(){
    const users = this.getProps("users", []);
    users?.forEach((user)=>{
      const field = user.state.field;
      const { health } = user.state.stat;
      if( health <= 0 ){
        return false;
      }
      
      /**
       * Drawing User
       */
      const { width } = field.getState("size");
      const { x: posX, y: posY } = field.getState("pos.p1");

      const widthRadius = parseInt(width/2);

      if( user instanceof User ){
        this.drawer.circle(posX + widthRadius, posY + widthRadius, widthRadius, {
          type: "fill",
          color: "#ffff00",
        });
      } else {
        this.drawer.circle(posX + widthRadius, posY + widthRadius, widthRadius, {
          type: "fill",
          color: "#2020ff",
        });
      }

      /**
       * Drawing Aim
       */
      const aim = user.state.aim;
      let { x: aimX, y: aimY } = aim.pos;
      const aimWidthRadius = parseInt(aim.size.width/2);
      const aimHeightRadius = parseInt(aim.size.height/2);
      let aimRadius = aimWidthRadius;

      switch(aim.vector){
        case "UP":
          aimY += aimHeightRadius;
          aimRadius = aimHeightRadius;
          break;
        case "DOWN":
          aimY -= aimHeightRadius;
          aimRadius = aimHeightRadius;
          break;
        case "LEFT":
          aimX += aimWidthRadius;
          aimRadius = aimWidthRadius;
          break;
        case "RIGHT":
          aimX -= aimWidthRadius;
          aimRadius = aimWidthRadius;
          break;
      }

      this.drawer.circle(aimX, aimY, aimRadius, {
        type: "fill",
        color: "#ff0000"
      });
    });
  }

  drawAim(){
    
  }

  draw(){
    const ctx = this.getContext();
    const { width, height } = this.getState("maps");
    ctx.clearRect(0, 0, width, height);
    this.drawMatrix();
    this.drawPlayers();
  }
}

class StageManager extends StateUtil {
  constructor(props={}){
    let canvas = props.canvas;
    if( !canvas ){
      canvas = body.appendChild(document.createElement("canvas"));
      canvas.setAttribute("id", "canvas-playground");
      canvas.setAttribute("class", "canvas-playground");
    }
    super({
      ...props,
      canvas,
      size: {
        maps: [11, 11],
        field: [30, 30],
      }
    }, {
      stage: null, // Stage
      users: [],
      enermies: [],
      stages: [],
      settings: {
        maxPlayers: 2,
      },
      controller: null,
    });
  }

  init(){
    const size = this.props.size;
    const canvas = this.props.canvas;
    const stages = [];
    const users = [];

    const u1 = new User({
      username: "User1",
    });
    u1.init();
    users.push(u1);

    const e1 = new Enermy();
    e1.init();
    users.push(e1);

    const e2 = new Enermy();
    e2.init();
    users.push(e2);
    
    const s1 = new Stage({
      canvas: canvas,
      size: size,
      goal: [
        // [9, 0],
      ],
      spawn: [
        [2,3], [4,5], [5,5], [6,5],
      ],
      portal: [
        [0, 3], [0, 7],
        [2, 0], [2, 10],
        [8, 0], [8, 10],
        [10, 3], [10, 7],
      ],
      wall: [
        [0, 2], [0, 4], [0, 6], [0, 8], 
        [1, 0], [1, 1], [1, 2], [1, 4], [1, 5], [1, 6], [1, 8], [1, 9], [1, 10], 
        [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6], [3, 8], [3, 9], [3, 10],
        [4, 2], [4, 6], [4, 4], [4, 8], 
        [5, 2], [5, 6], [5, 8],
        [6, 2], [6, 4], [6, 6], [6, 8], 
        [7, 0], [7, 1], [7, 2], [7, 4], [7, 5], [7, 6], [7, 8], [7, 9], [7, 10],
        [9, 0], [9, 1], [9, 2], [9, 4], [9, 5], [9, 6], [9, 8], [9, 9], [9, 10], 
        [10, 2], [10, 4], [10, 6], [10, 8], 
      ],
      users: users,
    });
    s1.init();
    stages.push(s1);

    // 키 입력 이벤트 설정
    let c1 = this.state.controller;
    if( !c1 ){
      c1 = new Controller({
        mode: "wasd",
        onKeyDown: (e, vector, vectors) => {
          e.preventDefault();
          if( vector === "UNKNOWN" ){
            return false;
          }

          if( vector === "ACTION" ){
            u1.attack();
            return false;
          }

          // 방향만 전환
          const prevVector = u1.state.aim.vector;
          if( prevVector !== vector ){ // 바로 이동을 원하는 경우, 설정으로 처리
            u1.rotate(vector);
            return false;
          }

          // 이동
          u1.move(vector);
          return false;
          
          const prevField = u1.state.field;
          const nextField = prevField.state.link[vector];
          if( nextField ){
            if( nextField instanceof Wall ){
              return false;
            }
            u1.move(nextField, vector);
          }
        },
      });
    }
    c1.init();

    this.setState("users", users);
    this.setState("stages", stages);
    this.setState("controller", c1);

    this.render();
  }

  render(){
    const self = this;
    function drawer(){
      const stages = self.state.stages;
      stages?.forEach((stage)=>{
        stage.draw();
      });
      const drawing = requestAnimationFrame(drawer);
      self.setState("drawing", drawing);
    }
    cancelAnimationFrame(self.getState("drawing"));
    self.setState("drawing", null);
    drawer();
  }

  join(player, stage){
  }

  leave(player, stage){
  }
  
  start(){
  }

  finish(){
  }

}