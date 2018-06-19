(function () {
	// ------ Baseline setup -------
	//判断所处的全局环境并保存全局对象到root上
	var root = (typeof self === 'object' && self.self === self && self) || //windows 和 webworker
		(typeof global === 'object' && global.global === global && global) || //处于node的情况 
		this || {}; //小程序 和 use strict 

	//保存定义前jam的引用
	var previousJam = root.jam;

	//一个jam构造函数，返回一个jam的实例对象，
	//实例对象中，jam_wrapped是传入的值
	//让它同时支持函数式风格和面向对象的风格调用
	var jam = function(obj) {
		if (obj instanceof jam) return obj; //如果原型是jam，则返回
		if (!(this instanceof jam)) return new jam(obj); //否则调用构造器jam再实例化
		this.jam_wrapped = obj; //封装到特定的属性中便于调用
	};

	//判断导出环境，让jam在合适的环境导出
	if (typeof exports !== 'undefined' && !exports.nodeType) { //nodeType用于判断是否是windows环境中的节点
		if (typeof module !== 'undefined' && !module.nodeType && module.exports) {
			exports = module.exports = jam;
		}
		exports.jam = jam;
	} else {
		root.jam = jam; 
	}
	//版本号
	jam.VERSION = '0.2';

	var ArayProto = Array.prototype,
		push = ArayProto.push,
		//最大数组索引
		MAX_ARRAY_INDEX = Math.pow(2, 53) - 1,
		//判断类数组对象
		isArrayLike = function(collection) {
			var length = collection.length;
			return typeof length === 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
		};

	// Collection Functions 集合函数（数组或对象）
	// --------------------

	//通用的遍历方法，可用于遍历数组或对象
	//可以在回调函数返回false时停止循环
	jam.each = function(obj, callback) {
		var length, i = 0;

		//如果是类数组或数组就使用for循环
		if (isArrayLike(obj)) {
			length = obj.length;
			for (; i < length; i++) {
				if (callback.call(obj[i], obj[i], i) === false) {
					break;
				}
			}
			//对象就使用for...in
		} else {
			for (i in obj) {
				if (callback.call(obj[i], obj[i], i) === false) {
					break;
				}
			}
		}

		return obj;
	};



	// Arrays 数组函数
	// --------------------
	jam.shuffle = function() {

	};

	/**
	 * 利用对象的键不能重复的特点来判断去重
	 * 基本可以全部去重
	 * @param {array} array 
	 * @returns 
	 */
	jam.unique = function(array) {
		var obj = {};

		return array.filters(function(item, index, array) {
			return obj.hasOwnProperty(typeof item + JSON.stringify(item)) ? false : (obj[typeof item + JSON.stringify(item)] = true);
		});
	};

	// Object 对象函数
	// --------------------

	/**
	 * 检测各种类型的值
	 * 如果是基本类型就使用typeof，引用类型使用toString
	 * 无法检测Math 和 JSON
	 * 方法来自于jQuery2.0
	 * @param {any} obj - 要判断的变量
	 * @returns {string} obj
	 * @example type([1, 2, 3])
	 */
	jam.type = function(obj) {
		var class2type = {};

		//生成class2type映射
		"Boolean Number String Funtion Array Date RegExp Object Error Set Map".split(" ").map(function (item, index) {
			class2type['[object ' + item + ']'] = item.toLowerCase();
		});
		//在IE6中，null和 undefined 会被object.prototype.toString 识别成 [object object]
		if (obj === null) {
			return obj + '';
		}

		return typeof obj === 'object' || typeof obj === 'function' ?
			class2type[Object.prototype.toString.call(obj)] || "object" : //'object' 是在class2type不包含的情况下，它们并不在type对象中
			typeof obj;
	};

	/**
	 * 判断某个对象是否为用"{}"或"new Object"建立的对象
	 * 为了跟null，arraydocuments等区分开来，因为这些用typeof 返回的都是object
	 * @param {object} obj 要判断的对象
	 * @returns true/false
	 * @example console.log(jam.isPlainObject({})) // true
	 * @example console.log(jam.isPlainObject(new Person('yayu'))); // false
	 */
	jam.isPlainObject = function(obj) {
		var class2type = {};
		//等价于Object.prototype.toString
		var toString = class2type.toString;
		//等价于Object.prototype.hasOwnProperty
		var hasOwn = class2type.hasOwnProperty;
		var proto, Ctor;
		//排除掉明显不是obj的以及一些宿主对象如window
		if(!obj || toString.call(obj) !== "[object Object]") {
			return false;
		}
		//获取obj的原型 
		proto = Object.getPrototypeOf(obj);
		//没有原型对象是纯粹的，Object.create(null)在这里返回true
		if(!proto) {
			return true;
		}
		//判断new Object方式创建的对象，判断proto是否有constructor属性，有就让Ctor的值为proto.constructor
		//如果是Object函数创建的对象，Ctor在这里就等于Object的构造函数
		Ctor = hasOwn.call(proto, 'constructor') && proto.constructor;
		//判断Ctor构造函数是不是Object构造函数，用于区分自定义构造函数和Object构造函数
		return typeof Ctor === 'function' && hasOwn.toString.call(Ctor) === hasOwn.toString.call(Object);
	};

	//判断是否为函数
	jam.isFunction = function(obj) {
		return typeof obj === 'function' || false;
	};

	//返回一个对象里所有的方法名, 已经排序的
	//对象里每个方法(属性值是一个函数)的名称.
	jam.functions = function(obj) {
		var names = [];
		for (var key in obj) {
			if (jam.isFunction(obj[key])) {
				names.push(key);
			}
		}
		return names.sort();
	};

	/**
	 * 将两个或更多对象的内容合并到第一个对象。
	 * 在默认情况下，通过jam.extend()合并操作不是递归的;
	 * 如果第一个对象的属性本身是一个对象或数组，那么它将完全用第二个对象相同的key重写一个属性。
	 * 这些值不会被合并。
	 * @param {boolean} deep 如果是true，合并成为递归（又叫做深拷贝）
	 * @param {obejct} target 对象扩展。这将接收新的属性。
	 * @param {object} object1 一个对象，它包含额外的属性合并到第一个参数.
	 * @param {object} objectN 包含额外的属性合并到第一个参数 
	 * @returns {obj} 返回target对象 
	 * @example var target = jam.extend(true, obj1, obj2); 
	 */
	jam.extend = function() {
		//默认不进行深拷贝
		var deep = false;
		var name, options, src, copy, clone, copyIsArray;
		var length = arguments.length;
		//记录要复制对象的下标
		var i = 1;
		//第一个参数不传布尔值的情况下，target默认是第一个参数
		var target = arguments[0] || {};
		//如果第一个参数是布尔值，那么第二个参数是target
		if(typeof target === 'boolean') {
			deep = target;
			target = arguments[i] || {};
			i++;
		}
		//如果target不是对象，就无法复制，所以默认赋值为{}
		if(typeof target !== 'object' && !this.isFunction(target)) {
			target = {};
		}
		//循环遍历要赋值的对象们
		for(;i < length; i++) {
			//获取当前对象
			options = arguments[i];
			//要求不能为空，避免extend(a, ,b)这种情况
			if(options !== null) {
				for(name in options) {
					//目标属性值
					src = target[name];
					//要复制对象的属性值
					copy = options[name];
					//避免循环引用
					if(target === copy) {
						continue;
					}
					//如果是深度拷贝，而且复制的属性是plainObject
					if(deep && copy && (this.isPlainObject(copy) || 
					(copyIsArray = Array.isArray(copy)))) { //或者复制属性值是数组的情况 
						if(copyIsArray) { //如果待复制对象属性值类型为数组，目标属性值类型不为数组的话，目标属性值就设为 []
							copyIsArray = false;
							clone = src && Array.isArray(src) ? src : [];
						} else { //如果待复制对象属性值类型为对象，目标属性值类型不为对象的话，目标属性值就设为 {}
							clone = src && this.isPlainObject(src) ? src : {};
						}
						target[name] = this.extend(deep, clone, copy);
					} else if (copy !== undefined) { //如果不是对象且非undefined就直接复制
						target[name] = copy;
					}
				}
			}
		}
		return target;
	};


	// Functions 与函数有关的函数
	// --------------------

	/**
	 * 防抖函数
	 * 将延迟函数的执行（真正执行）在函数最后一次调用时刻的wait毫秒后。 
	 * 
	 * @param {function} func - 执行函数
	 * @param {number} wait - 延迟时间
	 * @param {boolean} immediate - 立即执行函数，等到wait毫秒后才可以重新触发执行(在类似不小心点了提交按钮两下而提交了两次的情况下很有用)
	 * @returns {function}
	 * @example container.onmousemove = debounce(getUserAction, 1000);
	 */
	jam.debounce = function(func, wait, immediate) {

		var timeout, result;

		var debounced = function() {
			var context = this;
			var args = arguments;

			if (timeout) clearTimeout(timeout);
			if (immediate) {
				// 如果已经执行过，不再执行
				var callNow = !timeout;
				timeout = setTimeout(function() {
					timeout = null;
				}, wait);
				if (callNow) result = func.apply(context, args);
			} else {
				timeout = setTimeout(function() {
					func.apply(context, args);
				}, wait);
			}
			return result;
		};

		debounced.cancel = function () {
			clearTimeout(timeout);
			timeout = null;
		};

		return debounced;
	};

	/**
	 * 创建并返回一个像节流阀一样的函数，当重复调用函数的时候，至少每隔 wait毫秒调用一次该函数。
	 * 对于想控制一些触发频率较高的事件有帮助。
	 * 
	 * 如果你想禁用第一次首先执行的话，传递{leading: false}，
	 * 如果你想禁用最后一次执行的话，传递{trailing: false}。
	 * 
	 * @param {function} func - 执行函数 
	 * @param {number} wait - 延迟时间 
	 * @param {object} options - 设置
	 * @returns {function}
	 */
	jam.throttle = function(func, wait, options) {
		var timeout, context, args, result;
		var previous = 0;
		if (!options) options = {};

		var later = function() {
			previous = options.leading === false ? 0 : new Date().getTime();
			timeout = null;
			func.apply(context, args);
			if (!timeout) context = args = null;
		};

		var throttled = function() {
			var now = new Date().getTime();
			if (!previous && options.leading === false) previous = now;
			//下一次触发func剩余的时间
			var remaining = wait - (now - previous);
			context = this;
			args = arguments;
			//如果没有剩余的时间了或者改了系统时间
			if (remaining <= 0 || remaining > wait) {
				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}
				previous = now;
				func.apply(context, args);
				if (!timeout) context = args = null;
			} else if (!timeout && options.trailing !== false) {
				timeout = setTimeout(later, remaining);
			}
		};

		throttled.cancel = function() {
			clearTimeout(timeout);
			previous = 0;
			timeout = null;
		};

		return throttled;
	};

	// Utility 实用功能
	// --------------------

	/**
	 * 防冲突处理返回对jam对象的引用
	 * @returns this
	 */
	jam.noConflict = function() {
		root.jam = previousJam; //将先前保存的变量赋值给jam
		return this;
	};

	/**
	 * 返回一个min 和 max之间的随机整数。
	 *
	 * @param {number} min
	 * @param {number} max
	 * @returns {number} 
	 */
	jam.random = function(min, max) {
		//如果只有一个参数的情况，就返回0-min之间的随机值
		if (max === null) {
			max = min;
			min = 0;
		}
		return min + Math.floor(Math.random() * (max - min + 1));
	};

	/**
	 * 对async/await 进行错误处理提取
	 * @param {promise} promise 要处理的async函数
	 * @param {object} errorExt 要添加的错误信息
	 * @return {promise}
	 * @example let [err, res] = await to(getUsersData(params));
	 */
	jam.to = function(promise, errorExt) {
		return promise
			.then(function (data) {
				return [null, data];
			})
			.catch(function (err) {
				if (errorExt) {
					Object.assign(err, errorExt);
				}
				return [err, undefined];
			});
	};


	/**
	 * 设置cookie
	 * @param name cookie名称
	 * @param value 值
	 * @param iDay 有效时间（天数）
	 */
	jam.setCookie = function(name, value, iDay) {
		var oDate = new Date();
		iDay = iDay || 7;
		oDate.setDate(oDate.getDate() + iDay);
		console.log('oData', oDate);
		document.cookie = name + '=' + value + ';expires=' + oDate; 
	};

	/**
	 * 获取cookie的值
	 *
	 * @param {string} name cookie的名称
	 * @returns {string} 
	 */
	jam.getCookie = function(name) {
		var arr = document.cookie.split(';'), arr2;
		for(var i = 0; i < arr.length; i++) {
			arr2 = arr[i].split('=');
			if(arr2[0] === name) {
				return arr2[1];
			}
		}
		return '';
	};


	/**
	 * 删除cookie
	 *
	 * @param {string} name cookie的名称
	 */
	jam.removeCookie = function(name) {
		this.setCookie(name, 1, -1); //中间的值没有意义了，只要cookie天数设置了-1，就会删除。
	};

	/**
	 * 操作cookie
	 *
	 * @param {string} name cookie的名称
	 * @param {string} value 值
	 * @param {number} iDay 有效天数
	 * @returns
	 */
	jam.cookie = function(name, value, iDay) {
		if(arguments.length === 1) {
			return this.getCookie(name);
		} else {
			this.setCookie(name, value, iDay);
		}
	};

	/**
	 * 将自己的实用函数扩展到jam对象的原型上
	 * 参数形式为{name: function}
	 * @param {object} obj 要传入函数的对象
	 * @example jam.mixin({capitalize: function() {...}}) jam('HADWZ').capticalize(); //hadwz
	 * @returns jam
	 */
	jam.mixin = function(obj) {
		jam.each(jam.functions(obj), function (name) {
			var func = jam[name] = obj[name]; //将扩展方法也添加到jam函数对象上 
			jam.prototype[name] = function () {
				var args = [this.jam_wrapped];
				push.apply(args, arguments); //push在最上方已定义
				//将函数的返回值包裹成可以链式调用的对象
				return chainResult(this, func.apply(jam, args));
			};
		});
		return jam;
	};

	// Chaining 链式语法
	// --------------------

	//返回一个封装的对象. 在封装的对象上调用方法会返回封装的对象本身
	//直到 value 方法调用为止.
	jam.chain = function (obj) {
		//构建jam实例 {jam_warapped: obj}
		var instance = jam(obj);
		instance.jam_chain = true;
		return instance;
	};

	//将函数的返回值作为参数传入了chainResult，该函数又会返回这样一个对象
	//函数的返回值就保存在这个对象的jam_wrapped 中，这样就实现了链式调用
	var chainResult = function(instance, obj) {
		return instance.jam_chain ? jam(obj).chain() : obj;
	};

	//jam函数本身也是对象，它上面有很多函数可以通过jam.xx()调用
	//而通过jam.mixin(jam)把jam函数上的方法复制到jam的原型上
	//这样jam实例对象也可以调用jam的许多方法
	jam.mixin(jam);

	// 添加所有数组函数到jam中.
	jam.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
		var method = ArayProto[name];
		jam.prototype[name] = function() {
			var obj = this.jam_wrapped;
			method.apply(obj, arguments); //运行方法
			if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
			return chainResult(this, obj);
		};
	});

	//获取封装对象的最终值(jam_wrapped)
	jam.prototype.value = function () {
		return this.jam_wrapped;
	};

})();