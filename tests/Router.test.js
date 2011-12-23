define(['../Router', './utils/CallCounter'], function(Router, CallCounter) {
  var controllers = {
    c1: {
      get: {
        defaultAction: 'f1',
        f1: function() { return 'c1getf1'; },
        f2: function() { return 'c1getf2'; }
      },
      post: {
        f1: function() { return 'c1postf1'; }
      }
    },
    c2: {
      post: {
        defaultAction: 'f1',
        f1: function() { return 'c2postf1'; }
      }
    }
  };

  return {
    setUp: function(callback) {
      this.router = new Router({
        logger: {debug: function(){}, warn: function(){}}
      });
      this.app = new (new Class({
          Implements: [CallCounter],
          countCalls: ['get', 'post'],

          actionReturns: function(controller, type, action, retval)
          {
            var params = this.getParams(type);
            for (i in params) {
              var path = '/';
              if (controller !== null) path += controller;
              if (action !== null) path += '/' + action;
              //noinspection JSUnfilteredForInLoop
              if (params[i][0] === path && params[i][1]() === retval)
              return true;
            }
            return false;
          }
        }))();
      callback();
    },

    http: {
      'No actions registered if no controllers passed in': function(test) {
        test.expect(2);
        this.router.routeHttp(this.app, {});
        test.equal(0, this.app.count('get'));
        test.equal(0, this.app.count('post'));
        test.done();
      },

      'Controller actions are bound': function(test) {
        test.expect(4);
        this.router.routeHttp(this.app, controllers);
        test.ok(this.app.actionReturns('c1', 'get', 'f1', 'c1getf1'));
        test.ok(this.app.actionReturns('c1', 'get', 'f2', 'c1getf2'));
        test.ok(this.app.actionReturns('c1', 'post', 'f1', 'c1postf1'));
        test.ok(this.app.actionReturns('c2', 'post', 'f1', 'c2postf1'));
        test.done();
      },

      'Default actions of controllers are bound': function(test) {
        test.expect(2);
        this.router.routeHttp(this.app, controllers);
        test.ok(this.app.actionReturns('c1', 'get', null, 'c1getf1'));
        test.ok(this.app.actionReturns('c2', 'post', null, 'c2postf1'));
        test.done();
      },

      'Default actions of default controllers are bound': function(test) {
        test.expect(2);
        this.router.routeHttp(this.app, controllers, {get: 'c1', post: 'c2'});
        test.ok(this.app.actionReturns(null, 'get', null, 'c1getf1'));
        test.ok(this.app.actionReturns(null, 'post', null, 'c2postf1'));
        test.done();
      }
    }
  };
});
