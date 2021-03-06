/*

	Ractive-decorators-sortable
	===========================

	Version 0.2.1.

	This plugin adds a 'sortable' decorator to Ractive, which enables
	elements that correspond to array members to be re-ordered using
	the HTML5 drag and drop API. Doing so will update the order
	of the array.

	==========================

	Troubleshooting: If you're using a module system in your app (AMD or
	something more nodey) then you may need to change the paths below,
	where it says `require( 'Ractive' )` or `define([ 'Ractive' ]...)`.

	==========================

	Usage: Include this file on your page below Ractive, e.g:

	    <script src='lib/Ractive.js'></script>
	    <script src='lib/Ractive-decorators-sortable.js'></script>

	Or, if you're using a module loader, require this module:

	    // requiring the plugin will 'activate' it - no need to use
	    // the return value
	    require( 'Ractive-decorators-sortable' );

	Then use the decorator like so:

	    <!-- template -->
	    <ul>
	      {{#list}}
	        <li as-sortable>{{.}}</li>
	      {{/list}}
	    </ul>

	    var ractive = new Ractive({
	      el: myContainer,
	      template: myTemplate,
	      data: { list: [ 'Firefox', 'Chrome', 'Internet Explorer', 'Opera', 'Safari', 'Maxthon' ] }
	    });

	When the user drags the source element over a target element, the
	target element will have a class name added to it. This allows you
	to render the target differently (e.g. hide the text, add a dashed
	border, whatever). By default this class name is 'droptarget'.

	You can configure the class name like so:

	    <!-- template -->
	    <ul>
	      {{#list}}
	        <li as-sortable="null, 'aDifferentClassName'">{{.}}</li>
	      {{/list}}
	    </ul>

	PS for an entertaining rant about the drag and drop API, visit
	http://www.quirksmode.org/blog/archives/2009/09/the_html5_drag.html

*/

var sortableDecorator = (function (global, factory) {
    'use strict';

    // Common JS (i.e. browserify) environment
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
        factory(require('Ractive'));
    }

    // AMD?
    else if (typeof define === 'function' && define.amd) {
        define(['Ractive'], factory);
    }

    // browser global
    else if (global.Ractive) {
        factory(global.Ractive);
    }

    else {
        throw new Error('Could not find Ractive! It must be loaded before the Ractive-decorators-sortable plugin');
    }

}(typeof window !== 'undefined' ? window : this, function (Ractive) {
    'use strict';

    var sortable,
        ractive,
        sourceKeypath,
        sourceArray,
        dragstartHandler,
        dragenterHandler,
        removeTargetClass,
        preventDefault,
        errorMessage,
        nodeMapping = [],
        getNodeToMove = function (draggableNode) {
            return nodeMapping
                .find(function (item) { return item.draggableNode === draggableNode; })
                .nodeToMove;
        },
        eventNameToFire;

    sortable = function (node, draggableElSelector, targetClass, _eventNameToFire) {
        var nodeToMove, draggableNode;

        if (draggableElSelector != null) { // jshint ignore:line
            nodeToMove = node;
            draggableNode = node.querySelector(draggableElSelector);
        }
        else {
            nodeToMove = draggableNode = node;
        }

        nodeMapping.push({
            nodeToMove: nodeToMove,
            draggableNode: draggableNode
        });

        nodeToMove.dataset.targetClass = targetClass || 'droptarget';
        eventNameToFire = _eventNameToFire;

        node = draggableNode;
        node.draggable = true;

        node.addEventListener('dragstart', dragstartHandler, false);
        node.addEventListener('dragend', removeTargetClass, false);
        node.addEventListener('dragenter', dragenterHandler, false);
        // necessary to prevent animation where ghost element returns
        // to its (old) home
        node.addEventListener('dragover', preventDefault, false);
        node.addEventListener('drop', removeTargetClass, false);

        return {
            teardown: function () {
                node.removeEventListener('dragstart', dragstartHandler, false);
                node.removeEventListener('dragend', removeTargetClass, false);
                node.removeEventListener('dragenter', dragenterHandler, false);
                node.removeEventListener('dragover', preventDefault, false);
                node.removeEventListener('drop', removeTargetClass, false);
            }
        };
    };

    errorMessage = 'The sortable decorator only works with elements that correspond to array members';

    dragstartHandler = function (event) {
        var me = getNodeToMove(this),
            context = Ractive.getContext(me);

        sourceKeypath = context.resolve();
        sourceArray = context.resolve('../');

        if (!Array.isArray(context.get('../'))) {
            throw new Error(errorMessage);
        }

        event.dataTransfer.setData('foo', true); // enables dragging in FF. go figure

        // keep a reference to the Ractive instance that 'owns' this data and this element
        ractive = context.ractive;

        event.stopPropagation();
    };

    dragenterHandler = function (event) {
        var me = getNodeToMove(this),
            targetKeypath, targetArray, array, source, context;

        event.preventDefault();

        context = Ractive.getContext(me);

        // If we strayed into someone else's territory, abort
        if (context.ractive !== ractive) {
            return;
        }

        targetKeypath = context.resolve();
        targetArray = context.resolve('../');

        // if we're dealing with a different array, abort
        if (targetArray !== sourceArray) {
            return;
        }

        // if it's the same index, add droptarget class then abort
        if (targetKeypath === sourceKeypath) {
            me.classList.add(me.dataset.targetClass);
            return;
        }

        event.dataTransfer.dropEffect = "move";

        // remove source from array
        source = ractive.get(sourceKeypath);
        array = Ractive.splitKeypath(sourceKeypath);

        ractive.splice(targetArray, array[array.length - 1], 1);

        // the target index is now the source index...
        sourceKeypath = targetKeypath;

        array = Ractive.splitKeypath(sourceKeypath);

        // add source back to array in new location
        ractive.splice(targetArray, array[array.length - 1], 0, source);

        if (eventNameToFire != null) { // jshint ignore:line
            ractive.fire(eventNameToFire, context, array);
        }
    };

    removeTargetClass = function (event) {
        var node = getNodeToMove(this);

        node.classList.remove(node.dataset.targetClass);
        event.stopPropagation();
    };

    preventDefault = function (event) {
        event.stopPropagation();
        event.preventDefault();
    };

    Ractive.decorators.sortable = sortable;

    return sortable;
}));

// Common JS (i.e. browserify) environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sortableDecorator;
}
