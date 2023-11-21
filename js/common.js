class Job {
  constructor(){
    this.state = {}
  }
}
class Adventurer extends Job { }
class Warrior extends Job { }

class Item {
  constructor(){
  }
}

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
}

class Player extends StateUtil {
  constructor(props={}){
    const state = Object.assign({}, {
      _id: null,
      username: props.username,
      stat: {
        level: 1,
        exp: 0,
        health: 100,
        strength: 10,
        limit: {
          exp: 100,
        },
      },
      inventory: [],
      equipment: {
        weapon: null,
        armour: null,
        accessory: null,
        potion: null,
      },
      settings: {
        maxLevel: 30,
      },
    });
    super(props, state);
  }
  attack(target){
    let isKilled = false;
    if( target instanceof Player ){
      const damage = this.getState("stat.strength");
      if( typeof target.hitted === 'function' ){
        isKilled = target.hitted(damage);
      }
    }
    return isKilled;
  }
  hitted(damage=0, target){
    let isDead = false;
    let health = this.getState("stat.health");
    let armour = this.getState("equipment.armour", 0);
    if( armour > 0 ){ damage -= armour; }
    if( damage > 0 ){ health -= damage; }
    if( health <= 0 ){ health = 0; isDead = true; }
    this.setState("stat.health", health);
    return isDead;
  }
  died(){
    this.setState("stat.health", 0);
    return true;
  }
  levelUp(){}
  incExp(){}
}

class User extends Player {
  constructor(props={}){
    super({
      ...props,
      type: "user",
    });
  }
}

class Enermy extends Player {
  constructor(props={}){
    super({
      ...props,
      type: "enermy",
    });
  }
}


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
      col: props.col || 0,
      row: props.row || 0,
      pos: {
        p1: { x:  0, y:  0 },
        p2: { x: width, y:  0 },
        p3: { x: width, y: height },
        p4: { x:  0, y: height },
      },
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
    this.setState({
      pos: { p1, p2, p3, p4 }
    });
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
      document.addEventListener("keydown", window.controllerHandler);
      events.push({
        event: "keydown",
        handler: window.controllerHandler,
        target: document,
      });
    }
  }

  unbindEvents(){
    const events = this.state.events;
    // if( window.controllerHandler ){
    //   document.removeEventListener("keydown", window.controllerHandler);
    //   window.controllerHandler = null;
    // }
    events?.forEach(({ event, handler, target })=>{
      target.removeEventListener(event, handler);
    });
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

class Stage extends StateUtil {
  constructor(props={}){
    const state = Object.assign({}, {
      insts: {
        canvas: props.canvas,
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
    this.makeMatrix();

    const { width, height } = this.getState("maps");
    const canvas = this.getCanvas();
    canvas.width = width;
    canvas.height = height;

    this.drawMatrix();
    this.bindEvents();
  }

  makeMatrix(){
    const fields = [];
    const roads = [];
    const goals = [];
    const walls = [];
    const spawners = [];

    const fieldSize = this.getProps("size.field");
    const goal = this.getProps("goal", []);
    const spawn = this.getProps("spawn", []);
    const wall = this.getProps("wall", []);
    const [rows, cols] = this.getState("maps.size");

    let width = 0;
    let height = 0;
    let mIdx = 0;
    for(let rIdx=0; rIdx<rows; rIdx++){
      const colArr = [];
      for(let cIdx=0; cIdx<cols; cIdx++){
        const fieldConfig = {
          index: mIdx,
          row: rIdx,
          col: cIdx,
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
        } else {
          col = new Road(fieldConfig);
          roads.push(col);
        }
        const size = col.getState("size");
        // const adjustX = (colArr.length)+1;
        // const adjustY = (fields.length)+1;
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
      fields.push(colArr);
    }
    this.setState("maps.matrix", fields);
    this.setState("maps.width", width);
    this.setState("maps.height", height);
    
    return fields;
  }

  drawMatrix(){
    const ctx = this.getContext();
    const matrix = this.makeMatrix();
    matrix.reduce((prev, crnt)=>([].concat(prev, crnt))).forEach((field)=>{
      const type = field.getProps("type");
      const index = field.getState("index");
      const { width, height } = field.getState("size");
      const { p1, p2, p3, p4 } = field.getState("pos");
      const { showNumber } = field.getState("settings");

      ctx.beginPath();
      if( type === "goal" ){ // field instanceof Goal
        ctx.fillStyle = "#ffff00";
        ctx.strokeStyle = "#ffff00";
      } else if( type === "spawn" ){ // field instanceof Spawn
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#ff0000";
      } else if( type === "wall" ){ // field instanceof Wall
        ctx.fillStyle = "#00ff00";
        ctx.strokeStyle = "#00ff00";
      } else { // field instanceof Road
        ctx.fillStyle = "#0000ff";
        ctx.strokeStyle = "#0000ff";
      }
      ctx.rect(p1.x, p1.y, width, height);
      // ctx.fill();
      ctx.stroke();
      if( showNumber ){
        const fontSize = ( width / 2 );
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(index, p1.x+(width/2), p1.y+(height/2)+(fontSize/3));
      }
      ctx.closePath();
    });
  }

  bindEvents(){
    const canvas = this.getCanvas();
    if( this.isMobile ){

    } else {
      canvas.addEventListener("keydown", (e)=>{

      });
    }
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
    const canvas = this.props.canvas;
    const s1 = new Stage({
      canvas: canvas,
      size: {
        maps: [10, 10],
        field: [20, 20],
      },
      goal: [
        [9, 0],
      ],
      spawn: [
        [0,5], [2,5], [5,5]
      ],
      wall: [
        [1, 5], [3, 5],
        [1, 4], [3, 4], 
      ],
    });
    s1.init();

    let controller = this.state.controller;
    if( !controller ){
      controller = new Controller({
        mode: "wasd",
        onKeyDown: (e, vector, vectors) => {
          e.preventDefault();
          console.log(vector, vectors);
        },
      });
    }
    controller.init();

    this.setState("controller", controller);
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