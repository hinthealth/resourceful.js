(function() {
// Ensure object.create exists (IE8)
if(typeof Object.create !== "function") {
  Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}
var extend = angular.extend;

var module = angular.module('resourceful', []);

module.provider('resourceful',
  function ResourcefulProvider() {
    var self = this;
    function Configurable(defaults){
      this.configure(defaults);
    }
    Configurable.prototype.configure = function(params){
      extend(this, params);
      return this;
    };
    Configurable.prototype.endpoint = function(path){
      return new Endpoint(this, path);
    };
    Configurable.prototype.url = function(){
      return this.prefix;
    };
    Configurable.prototype.resource = function(name){
      return new Resource(this, name);
    };
    Configurable.prototype.singleton = function(name){
      return new Resource(this, name);
    };

    this.base = new Configurable({
      identifyBy: 'id',
      prefix: ''
    });


  /*****************
    Sample Usage

    resourcefulProvider.configure({
      foo: bar;
    });

    authEndpoint = resourcefulProvider.endpoint();

    authEndpoint.headers.add('X-AUTH-KEY', authKey);

    openEndpoint = resourcefulProvider.endpoint();

    authEndpoint.endpoint('provider');

    resourcefulProvider.on('error', function(){

    });

    openEndpoint.singleton('user', only: );
    openEndpoint.singleton('session');
  */


    /* *****************************
      Resource class
      ------------------------------
      Define a new model with:
      var user = new SingletonModel('user')

      Lets you configure options like
        user.url = 'http://foo.bar'

      This lets you find and create new users using:
      - #build(attributes)
      - #create(attributes)
      - #find(id, params)
      - #all(params)
    */

    var Resource = function(parent, name){
      this.endpoint = new Endpoint(parent, name);
      this.recordClass = new Record(this);
      this.identifyBy = parent.identifyBy;
      this.associations = {};
    };

    Resource.prototype.resource = function(name){
      this.associations[name] = new Resource(this, name);
    };

    // Resource.prototype.recordClass = function(){
    //   if(!this._recordClass){
    //     this._recordClass = Object.create(Record.prototype);
    //     this._recordClass.constructor = Record;
    //   }
    //   return this._recordClass;
    // }
    Resource.prototype.record = function(){
      var associationHolder = Object.create(this.recordClass);
      associationHolder.associations(this.associations);
      return Object.create(associationHolder);
    };

    // Resource.prototype.doFind = function(id){
    //   return this.endpoint.endpoint(id).get();
    // };
    // Resource.prototype.doCreate = function(attributes){
    //   return this.endpoint.post(attributes);
    // };
    // Resource.prototype.doUpdate = function(id, attributes){
    //   return this.endpoint.endpoint(id).patch(attributes);
    // };
    Resource.prototype.build = function(attributes){
      var record = this.record();
      record.setAttributes(attributes);
      return record;
    };
    Resource.prototype.create = function(attributes){
      var record = this.build(attributes);
      record.save();
      return record;
    };
    Resource.prototype.find = function(id){
      var record = this.record();
      record.setIdentifier(id);
      record.load();
      return record;
    };
    Resource.prototype.arrayfromResponse = function(response){
      return response.data;
    };
    Resource.prototype.all = function(params){
      var collection = [];
      var self = this;
      collection.promise = this.endpoint.get();
      collection.promise.then(function(response){
        var index, record, responseArray, attributes;
        responseArray = self.arrayfromResponse(response);
        for(index in responseArray){
          attributes = responseArray[index];
          record = self.record();
          record.setAttributes(attributes);
          record.setIdentifier(record.toParam());
          collection.push(record);
        }
      });
      return collection;
    };

    /* *****************************
      Record class
      ------------------------------
      Define a new model with:
      var user = new Record(resource)

      Lets you configure options like

      This lets you find and create new users using:
      - #save(attributes)
      - #attributes(attributes)
      - #load(params)
    */


    // TODO: Rename to RecordProto
    function Record(resource){
      this.setResource(resource);
      // this._newRecord = true; // Default to true
      // this._errors = {};
    }

    Record.prototype.associations = function(associations){
      this.associations = associations;
      extend(this, this.associations);
    };
    Record.prototype.endpoint = function(type){
      // TODO (gm): Allow other create actions
      // TODO (gm): Cache endpoint;
      if(type == 'record'){
        return this.resource.endpoint.endpoint(this.toParam());
      }else{
        return this.resource.endpoint;
      }
    };
    Record.prototype.setResource = function(resource){
      this.resource = resource;
      return this;
    };

    Record.prototype.errors = function(on){
      if(this._errors === undefined) this._errors = {};
      if(on){
        return this._errors[on] || false;
      }
      return this._errors.length > 0 ? this._errors : false;
    };
    Record.prototype.identifyBy = function(){
      return this.resource.identifyBy;
    };
    Record.prototype.setIdentifier = function(identifier){
      var name;
      this[this.identifyBy()] = identifier;
      this._newRecord = false;
      for(name in this.associations){
        this[name].endpoint.setParent(this.endpoint('record'));
      }
    };
    Record.prototype.reload = function(){
      this.load();
    };
    Record.prototype.isNewRecord = function(){
      if(this._newRecord === undefined) this._newRecord = true;
      return this._newRecord;
    };
    Record.prototype.toParam = function(){
      return this[this.identifyBy()];
    };

    Record.prototype.setAttributes = function(attributes){
      var attrName;
      for (attrName in attributes){
        this[attrName] = attributes[attrName];
      }
      return attributes;
    };
    Record.prototype.attributes = function(){
      var attrName, attribs = {};
      for (attrName in this) {
        if(attrName[0] != '_' && this.hasOwnProperty(attrName)){
          attribs[attrName] = this[attrName];
        }
      }
      return attribs;
    };

    Record.prototype.attributesfromResponse = function(response){
      return response.data;
    };
    Record.prototype.capture = function(event, promise){
      var self = this;
      promise.then(function(response){
        if(event !== 'delete'){
          self.setAttributes(self.attributesfromResponse(response));
        }
        if(event == 'create'){
          self.setIdentifier(self.toParam());
        }
      }, function(response){
        self._errors = response.data.errors;
      });
    };

    Record.prototype.load = function(){
      var promise = this.endpoint('record').get();
      this.capture('load', promise);
      return promise;
    };
    Record.prototype.save = function(){
      var promise;
      if(this.isNewRecord()){
        promise = this.endpoint().post(this.attributes());
        this.capture('create', promise);
      }else{
        promise = this.endpoint('record').patch(this.attributes());
        this.capture('update', promise);
      }
      return promise;
    };

    /* *****************************
      Singleton record class
      ------------------------------
      Define a new model with:
      var user = new SingletonModel('user')

      Lets you configure options like
        user.url = 'http://foo.bar'

      This lets you find and create new users using:
      - #build(attributes)
      - #create(attributes)
      - #find(params)
    */

    function SingletonRecord(parent){
      this.prototype = Record;
      this.parent = parent;
      this._newRecord = true; // Default to true
    }
    SingletonRecord.prototype.endpoint = function(){
      return this.parent;
    };

    /* ***************************
       Endpoint
      ----------
       Interface to basic HTTP CRUD.
       Has a url() method and setter.
       Allows default params, headers, etc
    */

    var Endpoint = function(parent, path){
      if(path) this.path = path;

      this.setParent(parent);
    };

    Endpoint.prototype.setParent = function(parent){
      this.parent = parent;
    }
    Endpoint.prototype.endpoint = function(path){
      return new Endpoint(this, path);
    };

    Endpoint.prototype.one = function(id){
      return this.child(id);
    };

    Endpoint.prototype.url = function(){
      if(this._url) return this._url;
      if(this.parent) {
        return this.parent.url() + '/' + this.path;
      }
      if(this.path) {
        return this.path;
      }
      return '/';
    };
    Endpoint.prototype.defaults = {};
    Endpoint.prototype.httpRequest = function(verb, data, params, headers){
      if(!this.http) throw("http not defined yet!");
      // Add default headers, params, callbacks, etc;
      var args = {
          url: this.url(),
          method: verb,
          data: data,
          params: params,
          headers: headers
      };
      return this.http(args);
    };
    // TODO: Add HEAD, TRACE, OPTIONS
    Endpoint.prototype.post = function(data){
      return this.httpRequest('POST', data);
    };
    Endpoint.prototype.get = function(params){
      return this.httpRequest('GET', null, params);
    };
    Endpoint.prototype.patch = function(data){
      return this.httpRequest('PATCH', data, null);
    };
    Endpoint.prototype.put = function(data){
      return this.httpRequest('PUT', data, null);
    };
    Endpoint.prototype.delete = function(){
      return this.httpRequest('DELETE');
    };


    /* *****************************
      Provider configuration methods
      ------------------------------
      For use in the angular app.config
    */
    this.endpoint   = Endpoint.endpoint;
    this.configure  = this.base.configure;

    this.$get = ['$http', '$q', function($http, $q) {
      Endpoint.prototype.http = $http;
      // Endpoint.prototype.q = $q;
      return this.base;
    }];
  }
);

})();


/***************************************
  Resourceful API
  ---------------


/ * Introduction     * /

api = Resourceful.endpoint().configure({'prefix': '/api'});

var User = api.resources('users');
var Message = User.resources('messages');

// Returns resource object
var user = api.users.build({name: 'sammy'});

var savePromise = user.save();
// HTTP POST /api/users {name: 'sammy'}

savePromise.then(function(successful){
  // Response code 200-299
  // Handle success
}, function(error){
  // Response code 300-599
  // Handle error
});

// Create returns resource object
var message = user.messages.create({message: 'ok'});
// HTTP POST /api/users/ID/messages {message: 'ok'}
message.afterSave(function(httpResponse){
  // Save promise resolved
  message.
}, function(httpResponse){
  // Save failed
})

expect(user.messages.length).toEqual(1);

var user = api.users.find(userId);

user.name = 'sampson';
user.save().then(function(){
  // HTTP PATCH /api/users/ID {name: 'sampson'}
  alert('saved!');
});

var message = user.messages.find(messageId);
var newMessage = user.messages.create({message: 'Hello'})

var newUser = api.users.build({name: 'franklin'})
newUser.save()
var allUsers = api.users.all({limit: 10})

/ * Setup            * /

/ *                  * /

/ * Nested Resources * /




*/