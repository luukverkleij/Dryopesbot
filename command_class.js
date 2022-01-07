exports.commandspool = class {
  constructor(commands) {
    this.cmds = [];
  }
  
  async execute(client, target, ctx, msg) {
    var calls = [];
    for(var i = 0; i < this.cmds.length; i++) {
      calls += this.cmds[i].execute(client, target, ctx, msg);
    }
    
    let result = await Promise.all(calls);
    
    return result;
  }
  
  add(name, type, optionalarg, callback) {
    this.cmds.push( new exports.command(name, type, optionalarg, callback) );
  }
  
  print() {
    
  }
}

exports.command = class {
  constructor(name, type, optionalarg, callback, description) {
    this.name = name;
    this.type = type;
    this.optionalarg = optionalarg;
    this.checkCustom = this._check_public;
    this.callback = callback;
    this.description = description;
    
    this._checks = {"public" : this._check_public,
                   "mods" : this._check_mods,
                   "private" : this._check_private,
                   "debug" : this._check_debug};
  }
  
  async execute(client, target, ctx, msg) {
    if(this._check(ctx, msg)) {
      this.callback(client, target, ...this._parse(msg));
      return true;
    }
    return false;
  }
  
  _check(ctx, msg) {
    if(Array.isArray(this.name))
      return this.name.reduce( (x, y) => x || msg.startsWith(y), false) && this._checks[this.type](ctx, msg);
    
    return msg.startsWith(this.name) && this._checks[this.type](ctx, msg);
  }
  
  _check_public(ctx, msg) {
    return true;
  }
  
  _check_mods(ctx, msg) {
    return ctx.mod || (ctx.badges && ctx.badges["broadcaster"]); 
  }
  
  _check_private(ctx, msg) {
    return (ctx.badges && ctx.badges["broadcaster"]);
  }
  
  _check_debug(ctx, msg) {
    return ctx.username === "dryopes";
  }
  
  _parse(msg) {
    msg = msg.split(/(?<=^\S+)\s/)[1];
    
    var result;
    if(this.callback.length <= 3)
      result = [msg];
    else if(msg.includes(",")) {
      result = msg.split(",").map( str => str.trim());
    }
    else if(msg.includes("\"")) {
      result = msg.match(/\S+|"[^"]+"/g);
    } else {
      result = msg.split(/[ ,]+/);
    }
    
    return result;
  }
}

Object.defineProperty(exports.command, 'types', {
    value: ["public", "mods", "private", "debug", "custom"],
    writable : false,
    enumerable : true,
    configurable : false
});
