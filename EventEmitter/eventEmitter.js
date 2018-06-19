(function () {
	//判断所处的全局环境
	var root = (typeof self === 'object' && self.self === self && self) || //在window 和 webworker的环境下
	(typeof global === 'object' && global.global === global && global) || //处于node环境下
	this || {}; //小程序或use strict

	var util = {
		//判断传入的监听函数是否有效
		isValidListener: function(listener) {
			if (typeof listener === 'function') {
				return true;
			} else if (listener && typeof listener === 'object') {
				return this.isValidListener(listener.listener);
			} else {
				return false;
			}
		},

		//判断是否重复
		indexOf(array, item) {
			var result = -1;
			item = typeof item === 'object' ? item.listener : item;
			for (var i = 0, len = array.length; i < len; i++) {
				if (array[i].listener === item) {
					result = i;
					break;
				}
			}
			return result;
		}
	};

	function EventEmitter() {
		this._events = {};
	}

	EventEmitter.VERSION = '1.0.0';

	var proto = EventEmitter.prototype;
	
	/**
	 * 添加事件
	 * @param  {String} eventName 事件名称
	 * @param  {Function} listener 监听器函数
	 * @return {Object} 可链式调用
	 */
	proto.on = function (eventName, listener) {
		if(!eventName || !listener) return;
		if(!util.isValidListener(listener)) {
			throw new TypeError('listener must be a function');
		}

		var events = this._events;
		var listeners = events[eventName] = events[eventName] || [];
		var listenerIsWrapped = typeof listener === 'object';

		//不重复添加事件
		if (util.indexOf(listeners, listener) === -1) {
			listeners.push(listenerIsWrapped ? listener : {
				listener: listener,
				once: false
			});
		}

		return this;
	};

	/**
	 * 添加事件，该事件只能被执行一次
	 *
	 * @param {String} eventName 事件名称
	 * @param {Function} listener 监听器函数
	 * @returns {Object} 可链式调用
	 */
	proto.once = function (eventName, listener) {
		return this.on(eventName, {
			listener: listener,
			once: true
		});
	};

	/**
	 * 删除事件
	 *
	 * @param {String} eventName 事件名称
	 * @param {Function} listener 监听器函数
	 * @returns {Object} 可链式调用
	 */
	proto.off = function (eventName, listener) {
		var listeners = this._events[eventName],
			index;
		if (!listeners) {
			return;
		}
		for (var i = 0, len = listener.length; i < len; i++) {
			if (listeners[i] && listeners[i].listener === listener ) {
				index = i;
				break;
			}
		}
		if (typeof index !== 'undefined') {
			listeners.splice(index, 1, null);
		}
		return this;
	};

	/**
	 * 触发事件
	 *
	 * @param {String} eventName 事件名称
	 * @param {Array} args 传入监听函数的参数，以数组形式传入
	 * @returns {Object} 可链式调用
	 */
	proto.emit = function (eventName, args) {
		var listeners = this._events[eventName];
		if (!listeners) {
			return;
		}

		for (var i = 0; i < listeners.length; i ++) {
			var listener = listeners[i];
			if (listener) {
				listener.listener.apply(this, args || []);
				if (listener.once) {
					this.off(eventName, listener.listener);
				}
			}
		}

		return this;
	};

	/**
	 * 删除某一类型的所有事件或所有事件
	 * @param {String[]} eventName 事件名称
	 */
	proto.allOff = function (eventName) {
		if (eventName && this._events[eventName]) {
			this._events[eventName] = [];
		} else {
			this._events = {};
		}
	};

	//导出环境的判断
	if (typeof exports !== 'undefined' && !exports.nodeType) { //nodeType用于判断是否是windows环境中的节点
		if (typeof module !== 'undefined' && !module.nodeType && module.exports) {
			exports = module.exports = EventEmitter;
		}
		exports.EventEmitter = EventEmitter;
	} else {
		root.EventEmitter = EventEmitter;
	}


})();