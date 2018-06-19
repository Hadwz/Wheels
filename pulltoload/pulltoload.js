(function () {
	var root = (typeof self === 'object' && self.self === self && self) ||
	(typeof global === 'object' && global.global === global && global) ||
	this || {};

	var util = {
		extend: function (target) {
			for (var i = 1, len = arguments.length; i < len; i++) {
				for (var prop in arguments[i]) {
					if (arguments[i].hasOwnProperty(prop)) {
						target[prop] = arguments[i][prop];
					}
				}
			}

			return target;
		},
		isValidListener: function(listener) {
			if (typeof listener === 'function') {
				return true;
			} else if (listener && typeof listener === 'object') {
				return util.isValidListener(listener.listener);
			} else {
				return false;
			}
		},

		indexOf: function(array, item) {
			if  (array.indexOf) {
				return array.indexOf(item);
			} else {
				var result = -1;
				for (var i = 0, len = array.length; i < len; i++) {
					if(array[i] === item) {
						result = i;
						break;
					}
				}
				return result;
			}
		}
	};

	function EventEmitter() {
		this._events = {};
	}

	EventEmitter.prototype.on = function (eventName, listener) {
		if (!eventName && !listener) {
			return;
		}
		if (!util.isValidListener(listener)) {
			throw new TypeError('listener must be a function');
		}

		var events = this._events;
		var listeners = events[eventName] = events[eventName] ||  [];
		var listenerIsWrapped = typeof listener === 'object';

		//避免重复添加
		if (util.indexOf(listeners, listener) === -1) {
			listeners.push(listenerIsWrapped ? listener : {
				listener: listener,
				once: false
			});
		}
		return this;
	}

	EventEmitter.prototype.once = function (eventName, listener) {
		return this.on(eventName, {
			listener: listener,
			once: true
		});
	};

	EventEmitter.prototype.off = function (eventName, listener) {
		var listeners = this._events[eventName], index;
		if (!listeners) {
			return;
		} 

		for (var i = 0, len = listeners.length; i < len; i++) {
			if (listeners[i] && listeners[i] === listener) {
				index = i;
				break;
			}
		}

		if (typeof index !== 'undefined') {
			listeners.splice(index, 1, null);
		}

		return this;
	};

	EventEmitter.prototype.emit = function (eventName, args) {
		var listeners = this._events[eventName];
		if (!listeners) {
			return;
		}

		for (var i = 0; i < listeners.length; i++) {
			var listener = listeners[i];
			if (listener) {
				listener.listener.apply(this, args || []);
				if (listener.once) {
					this.off(eventName, listener);
				}
			} 
		}
		return this;
	};

	var isWindow = false;

	function PullToLoad(selector, options) {
		EventEmitter.call(this);
		//判断传入的selector是否是window和body
		if (selector.self === selector || document.querySelector(selector).tagName.toLowerCase() === 'body') {
			isWindow = true;
			this.element = window;
			this.container = document.body;
		} else {
			this.container = this.element = typeof selector === 'string' ? document.querySelector(selector) : selector;

		}
		//合并默认设置和用户设置
		this.options = util.extend({}, this.constructor.defaultOptions, options);
		this.init();
	}

	PullToLoad.VERSION = '1.0.0';

	PullToLoad.defaultOptions = {
		threshold: 100,
		loader: '#loader'
	};

	var proto = PullToLoad.prototype = new EventEmitter();

	proto.constructor = PullToLoad;

	proto.init = function () {
		this.setLoader();
		this.onscroll();
		this.bindEvent();
	};

	proto.setLoader = function() {
		var _loader = typeof this.options.loader === 'string' ? document.querySelector(this.options.loader) : this.options.loader;
		if (_loader) {
			_loader.style.display = 'none';
			this._loader = _loader;
		}
	}

	//绑定滚动事件
	proto.bindEvent = function() {
		this.element.addEventListener('scroll', () => {
			this.onscroll.apply(this);
		});
	};

	var loading = false;

	proto.onscroll = function () {
		if (isWindow) {
			this.onscroll = function () {
				var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				var viewPortHeight = window.innerHeight || document.documentElement.clientHeight; //视口高度
				var docHeight = document.documentElement.scrollHeight; //获取可以滚动的高度
				
				if(scrollTop + viewPortHeight > docHeight - this.options.threshold ) {
					this.append();
				}
			};
		} else {
			this.onscroll = function () {
				if (this.element.scrollTop + this.element.clientHeight > this.element.scrollHeight - this.options.threshold ) {
					this.append();
				}
			};
		}
	};

	proto.append = function () {
		if (loading) {
			return;
		}

		loading = true;

		if (this._loader) {
			if (this.element.self === this.element) {
				document.body.append(this._loader);
			} else {
				this.element.append(this._loader);
			}
			this._loader.style.display = 'block';
		}
		this.emit('load', [this.reset.bind(this)]);
	};

	proto.reset = function () {
		if (this._loader) {
			this._loader.style.display = 'none';
		}

		loading = false;
	};

	//判断导出环境，在合适的环境导出
	if (typeof exports !== 'undefined' && !exports.nodeType) { //nodeType用于判断是否是windows环境中的节点
		if (typeof module !== 'undefined' && !module.nodeType && module.exports) {
			exports = module.exports = jam;
		}
		exports.PullToLoad = PullToLoad;
	} else {
		root.PullToLoad = PullToLoad; 
	}

})();