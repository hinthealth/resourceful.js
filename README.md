# resourceful.js

Connect REST'ful API's to your Angular App

## Why Resourceful.js

Resourceful.js is designed with the following goals:

  1. Up-front configuration. Define your resources once and re-use them again and again.

	```
    var User = Resourceful.resource('users');
    var Message = User.resource('messages');
	```

  2. Simple find/create symantics for manipulating resources:

	```
    var user = User.find(2);
    user.name = 'joey';
    user.save();
    user.messages.create({body: 'Hello'})
	```

  3. Creating services for your resources is trivial

	```
    factory('User', [function(Resourceful){
      return Resourceful.resource('users');
    })
	```

  4. Built-in support for singular resources (http://guides.rubyonrails.org/v2.3.11/routing.html#singular-resources)

## Getting Started

### Installation

    npm install

    bower install

    karma start test/karma.js

### Usage

TBD. See src/resourceful.js for current WIP


