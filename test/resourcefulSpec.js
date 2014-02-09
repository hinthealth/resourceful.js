describe('service', function() {
  var $httpBackend, ResourcefulProvider;
  beforeEach(module('resourceful'));

  beforeEach(inject(function($injector){
    $httpBackend = $injector.get('$httpBackend');
    ResourcefulProvider = $injector.get('resourceful');
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe("Configuring the provider", function(){
    describe("setting prefix", function(){
      beforeEach(function(){
        //Configure
        ResourcefulProvider.configure({'prefix': '/api'});
      });


      it("should set the prefix for all requests", inject(function(resourceful){
        $httpBackend.expectGET('/api/users').respond([]);
        resourceful.endpoint('users').get();
        $httpBackend.flush();
      }));
    });
    describe("predefined resource", function(){
      beforeEach(function(){
        //Configure
        api = ResourcefulProvider.configure();
        api.resource('user');
      });
    });

  });


  describe("Nested resource", function(){
    var User, Message;
    beforeEach(inject(function(resourceful){
      User = resourceful.resource('users');
      User.resource('messages');
      // User.singleton('update')

      $httpBackend.when('GET', '/users/2').respond({name: 'Joey', id: 2});
      $httpBackend.when('GET', '/users/2/messages').respond([{id: 1, message: 'hey'}]);

    }));
    describe("nested #all", function(){
      it("should call the appropraite URL", function(){
        $httpBackend.expectGET('/users/2');
        $httpBackend.expectGET('/users/2/messages');
        var user = User.find(2);
        var messages = user.messages.all();
        $httpBackend.flush();
      });
      it("should return an array of the messages", function(){
        var messages = User.find(2).messages.all();
        $httpBackend.flush();
        expect(messages.length).toBe(1);
        expect(messages[0].message).toEqual('hey');
      });
      it("should execute a promise on success", function(){
        var promise = User.find(2).messages.all().promise;
        var asPromised = false;
        promise.then(function(result){
          asPromised = true;
        });
        $httpBackend.flush();
        expect(asPromised).toBe(true);
      });
      it("should not effect the parents attributes", function(){
        var user = User.find(2);
        user.name = 'frank';
        user.messages.all();
        $httpBackend.expectPATCH('/users/2', {id: 2, name: 'frank'}).respond({name: 'frank'});
        user.save();
        $httpBackend.flush();
      });
      it("should be unique to the parent", function(){
        $httpBackend.when('GET', '/users/3').respond({name: 'Sammy', id: 3});
        $httpBackend.when('GET', '/users/3/messages').respond([{id: 3, message: 'Hi Sammy'}]);

        $httpBackend.expectGET('/users/2');
        $httpBackend.expectGET('/users/3');

        // $httpBackend.expectGET('/users/2/messages');
        $httpBackend.expectGET('/users/3/messages');

        var joey = User.find(2);
        var sammy = User.find(3);

        var joeyMessages = joey.messages.all();
        var sammyMessages = sammy.messages.all();
        $httpBackend.flush();
        expect(joeyMessages[0].message).toEqual('hey');
        expect(sammyMessages[0].message).toEqual('Hi Sammy');
      });
    });

  });
  describe("Singleton resource", function(){

  });
  describe("A resource", function(){
    var User, usersData;
    beforeEach(inject(function(resourceful){
      User = resourceful.resource('users');
      usersData = [];
      $httpBackend.when('GET', '/users').respond(usersData);
      $httpBackend.when('GET', '/users/2').respond({name: 'Joey', id: 2});

      $httpBackend.whenPOST('/users').respond(function(method, url, data, headers) {
        usersData.push(angular.fromJson(data));
        return [method, url, data, headers];
      });

    }));
    describe("#all", function(){
      it("should call GET /users", function(){
        $httpBackend.expectGET('/users');
        User.all();
        $httpBackend.flush();
      });
    });
    describe("#create", function(){
      it("should call POST /users", function(){
        $httpBackend.expectPOST('/users', {name: 'joe'});
        User.create({name: 'joe'});
        $httpBackend.flush();
      });
    });
    describe("#build", function(){
      it("should call POST /users", function(){
        var user = User.build({name: 'joe'});
        $httpBackend.expectPOST('/users', {name: 'joe'});
        user.save();
        $httpBackend.flush();
      });
    });
    describe("#find", function(){
      it("should call GET /users/ID", function(){
        $httpBackend.expectGET('/users/2');
        User.find(2);
        $httpBackend.flush();
      });
    });



  });

  describe("Records", function(){
    var User, user;
    beforeEach(inject(function(resourceful){
      User = resourceful.resource('users');
    }));
    describe("initialization", function(){
      it("shouldn't fail with no arguments", function(){
        user = User.build();
        expect(user.name).toBe(undefined);
      });
      it("should accept an attribute hash", function(){
        user = User.build({name: 'Joey'});
        expect(user.name).toEqual('Joey');
      });
    });
    describe("#attributes", function(){
      it("should start with an empty hash", function(){
        user = User.build();
        expect(user.attributes()).toEqual({});
      });
      it("Return attributes that are set", function(){
        user = User.build();
        user.name = 'Frank';
        user.isAwesome = true;
        expect(user.attributes()).toEqual({name: 'Frank', isAwesome: true});
      });
      it("Keeps updated as they change", function(){
        user = User.build();
        user.name = 'Frank';
        user.name = 'Joey';
        expect(user.attributes()).toEqual({name: 'Joey'});
      });
    });
    describe("#setAttributes(hash)", function(){
      it("should update all the attributes", function(){
        user = User.build();
        user.name = 'Frank';
        user.isAwesome = false;
        user.setAttributes({isAwesome: true, height: 'Tallish'});
        expect(user.attributes()).toEqual({name: 'Frank', isAwesome: true, height: 'Tallish'});
      });
    });
    describe("#isNewRecord", function(){
      it("should have an ID name by default", function(){
        expect(User.identifyBy).toEqual('id');
      });
      it("should be true for built records", function(){
        expect(User.build().isNewRecord()).toBe(true);
      });
      it("should be false for found records", function(){
        $httpBackend.expectGET('/users/12').respond({id: 12, name: 'Joey'});
        user = User.find(12);
        $httpBackend.flush();
        expect(user.isNewRecord()).toBe(false);
      });
      it("shouldn't care if you set its id field", function(){
        expect(User.build({id: 12}).isNewRecord()).toBe(true);
      });
    });
  });
  describe("Record persistance", function(){
    var User, usersData, user;
    beforeEach(inject(function(resourceful){
      User = resourceful.resource('users');

    }));
    describe("unsaved", function(){
      beforeEach(function(){
        user = User.build({name: 'Sampson'});
      });
      describe("#save", function(){
        describe("successful", function(){
          beforeEach(function(){
            $httpBackend.expect('POST', '/users', {name: 'Sampson'}).respond({name: 'Sampson', id: 13, secret: '1234'});
          });
          it("should evaluate the promise success", function(){
            var succeeded = false;
            var failed = false;
            var promise = user.save();
            promise.then(function(){
              succeeded = true;
            }, function(){
              failed = true;
            });
            $httpBackend.flush();
            expect(succeeded).toBe(true);
            expect(failed).toBe(false);
          });
          it("should update the user attributes", function(){
            expect(user.id).toBe(undefined);
            user.save();
            $httpBackend.flush();
            expect(user.id).toBe(13);
            expect(user.secret).toBe('1234');
          });
          it("Should know that it's not a new record", function(){
            expect(user.isNewRecord()).toBe(true);
            user.save();
            $httpBackend.flush();
            expect(user.isNewRecord()).toBe(false);
          });
          it("Shouldn't have any errors", function(){
            expect(user.errors()).toBe(false);
            user.save();
            $httpBackend.flush();
            expect(user.errors()).toBe(false);
          });
        });
        describe("unsuccessful", function(){
          beforeEach(function(){
            $httpBackend.expect('POST', '/users', {name: 'Sampson'}).respond(400, '{"status": 400, "message": "Not valid", "errors": {"name": "Is pretty dumb"}}');
          });
          it("Should have errors", function(){
            expect(user.errors()).toBe(false);
            user.save();
            $httpBackend.flush();
            expect(user.errors('name')).toBe('Is pretty dumb');
          });
          it("Should stay a new record", function(){
            expect(user.isNewRecord()).toBe(true);
            user.save();
            $httpBackend.flush();
            expect(user.isNewRecord()).toBe(true);
          });
          it("should fail the promise", function(){
            var succeeded = false;
            var failed = false;
            var promise = user.save();
            promise.then(function(){
              succeeded = true;
            }, function(){
              failed = true;
            });
            $httpBackend.flush();
            expect(succeeded).toBe(false);
            expect(failed).toBe(true);
          });
        });
      });

    });
    describe("return from a find", function(){
      beforeEach(function(){
        user = User.find(10);
      });

    });
  });

  describe("Singleton resource", function(){

  });


});
