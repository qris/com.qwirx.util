goog.provide('com.qwirx.util.Exception');

/**
 * A base class for Freebase exceptions, that knows how to include
 * a stack trace on Chrome/V8.
 * @constructor
 */
com.qwirx.util.Exception = function(message)
{
	Error.call(this, message);
	this.message = message;
	
	// https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
	if (!this['stack'] && Error['captureStackTrace'])
	{
		Error.captureStackTrace(this, com.qwirx.util.Exception);
	}
	
	if (!this['stack'])
	{
		// http://www.eriwen.com/javascript/js-stack-trace/
		this.stack = "";
		var currentFunction = arguments.callee.caller;
		while (currentFunction)
		{
			var fn = currentFunction.toString();
			var fname = fn.substring(fn.indexOf("function") + 8,
				fn.indexOf('')) || 'anonymous';
			stack += fname + "\n";
			currentFunction = currentFunction.caller;
		}
	}	
};
goog.inherits(com.qwirx.util.Exception, Error);

/**
 * Patch stack trace support into goog.testing.JsUnitException
 */
goog.require('goog.testing.JsUnitException');
com.qwirx.util.OldJsUnitException = goog.testing.JsUnitException;
goog.testing.JsUnitException = function(comment, opt_message)
{
	goog.base(this);
	com.qwirx.util.OldJsUnitException.call(this, comment, opt_message);
};
goog.inherits(goog.testing.JsUnitException, com.qwirx.util.Exception);

goog.provide('com.qwirx.util.ExceptionEvent');
/**
 * An {@link goog.events.Event} fired by a component when it would
 * otherwise throw an exception, but in response to a browser event
 * this is not appropriate because no parent component has the chance
 * to intercept and handle the exception.
 * <p>
 * For the moment, a component should always throw the ExceptionEvent
 * at itself, so you can identify the source of the error, the
 * component that threw the exception, from the event's
 * {@link goog.events.Event.prototype.target} property.
 *
 * @constructor
 * @param {Error} exception The exception that would have been thrown,
 *   preferably a subclass of Exception which gives it a stack trace.
 * @param {goog.events.EventTarget} source The component that would have 
 *   thrown the 
 *   exception. Since any component can handle events, the source
 *   could be of any type, even a function; however it would normally
 *   be a goog.events.EventTarget, so it can have events
 *   thrown at it, and it would often be the UI component that handles
 *   a browser event, such as a goog.ui.Button.
 */
com.qwirx.util.ExceptionEvent = function(exception, source)
{
	this.type = com.qwirx.util.ExceptionEvent.EVENT_TYPE;
	this.source = source;
	this.exception_ = exception;
}
goog.require('goog.events.Event');
goog.inherits(com.qwirx.util.ExceptionEvent, goog.events.Event);

com.qwirx.util.ExceptionEvent.EVENT_TYPE = 'com.qwirx.util.ExceptionEvent';

/**
 * @returns The component that would have thrown the 
 *   exception. Since any component can handle events, the source
 *   could be of any type, even a function; however it would normally
 *   be a goog.events.EventTarget, so it can have events
 *   thrown at it, and it would often be the UI component that handles
 *   a browser event, such as a goog.ui.Button. Currently this
 *   is expected to be the same as the event's
 *   <code>target</code> property, and hence is not used.
 */
com.qwirx.util.ExceptionEvent.prototype.getSource = function()
{
	return this.source;
}

com.qwirx.util.ExceptionEvent.prototype.getException = function()
{
	return this.exception_;
}

/**
 * Static method that guards a callback against exceptions, sending
 * an event to allow interested parties to deal with the exception.
 * You should always use this guard in event handlers!
 */
com.qwirx.util.ExceptionEvent.guard = function(callback)
{
	return function(/* varargs */)
	{
		try
		{
			callback.apply(this, arguments);
		}
		catch (exception)
		{
			if (exception instanceof goog.events.Event)
			{
				throw new com.qwirx.util.Exception("For the love of God, " +
					"will you PLEASE stop throwing Events at me? " + 
					exception.type);
			}
			
			event = new com.qwirx.util.ExceptionEvent(exception, this);
			var ret = goog.events.dispatchEvent(this, event);

			// From goog.events.dispatchEvent comments:
			// If anyone called preventDefault on the event object (or
			// if any of the handlers returns false) this will also return
			// false. If there are no handlers, or if all handlers return
			// true, this returns true.
			//
			// A true return value indicates that no handler intercepted
			// the exception event, so rethrow it to help with debugging.
			if (ret)
			{
				if (exception.message)
				{
					exception.message += " (a com.qwirx.util.ExceptionEvent " +
						"was thrown, but nothing handled it.)";
				}
				
				throw exception;
			}
		}
	}
};
