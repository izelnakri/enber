(function() {
/*!
 * @overview  Ember - JavaScript Application Framework
 * @copyright Copyright 2011-2018 Tilde Inc. and contributors
 *            Portions Copyright 2006-2011 Strobe Inc.
 *            Portions Copyright 2008-2011 Apple Inc. All rights reserved.
 * @license   Licensed under MIT license
 *            See https://raw.github.com/emberjs/ember.js/master/LICENSE
 * @version   3.2.2
 */

/*globals process */
var enifed, requireModule, Ember;

// Used in ember-environment/lib/global.js
mainContext = this; // eslint-disable-line no-undef

(function() {
  function missingModule(name, referrerName) {
    if (referrerName) {
      throw new Error('Could not find module ' + name + ' required by: ' + referrerName);
    } else {
      throw new Error('Could not find module ' + name);
    }
  }

  function internalRequire(_name, referrerName) {
    var name = _name;
    var mod = registry[name];

    if (!mod) {
      name = name + '/index';
      mod = registry[name];
    }

    var exports = seen[name];

    if (exports !== undefined) {
      return exports;
    }

    exports = seen[name] = {};

    if (!mod) {
      missingModule(_name, referrerName);
    }

    var deps = mod.deps;
    var callback = mod.callback;
    var reified = new Array(deps.length);

    for (var i = 0; i < deps.length; i++) {
      if (deps[i] === 'exports') {
        reified[i] = exports;
      } else if (deps[i] === 'require') {
        reified[i] = requireModule;
      } else {
        reified[i] = internalRequire(deps[i], name);
      }
    }

    callback.apply(this, reified);

    return exports;
  }

  var isNode =
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    {}.toString.call(process) === '[object process]';

  if (!isNode) {
    Ember = this.Ember = this.Ember || {};
  }

  if (typeof Ember === 'undefined') {
    Ember = {};
  }

  if (typeof Ember.__loader === 'undefined') {
    var registry = {};
    var seen = {};

    enifed = function(name, deps, callback) {
      var value = {};

      if (!callback) {
        value.deps = [];
        value.callback = deps;
      } else {
        value.deps = deps;
        value.callback = callback;
      }

      registry[name] = value;
    };

    requireModule = function(name) {
      return internalRequire(name, null);
    };

    // setup `require` module
    requireModule['default'] = requireModule;

    requireModule.has = function registryHas(moduleName) {
      return !!registry[moduleName] || !!registry[moduleName + '/index'];
    };

    requireModule._eak_seen = registry;

    Ember.__loader = {
      define: enifed,
      require: requireModule,
      registry: registry,
    };
  } else {
    enifed = Ember.__loader.define;
    requireModule = Ember.__loader.require;
  }
})();

enifed('@glimmer/compiler', ['exports', 'ember-babel', 'node-module', '@glimmer/util', '@glimmer/wire-format', '@glimmer/syntax'], function (exports, _emberBabel, _nodeModule, _util, _wireFormat, _syntax) {
    'use strict';

    exports.TemplateVisitor = exports.TemplateCompiler = exports.precompile = exports.defaultId = undefined;

    var SymbolTable = function () {
        function SymbolTable() {}

        SymbolTable.top = function () {
            return new ProgramSymbolTable();
        };

        SymbolTable.prototype.child = function (locals) {
            var _this = this;

            var symbols = locals.map(function (name) {
                return _this.allocate(name);
            });
            return new BlockSymbolTable(this, locals, symbols);
        };

        return SymbolTable;
    }();

    var ProgramSymbolTable = function (_SymbolTable) {
        (0, _emberBabel.inherits)(ProgramSymbolTable, _SymbolTable);

        function ProgramSymbolTable() {

            var _this2 = (0, _emberBabel.possibleConstructorReturn)(this, _SymbolTable.apply(this, arguments));

            _this2.symbols = [];
            _this2.size = 1;
            _this2.named = (0, _util.dict)();
            _this2.blocks = (0, _util.dict)();
            return _this2;
        }

        ProgramSymbolTable.prototype.has = function () {
            return false;
        };

        ProgramSymbolTable.prototype.get = function () {
            throw (0, _util.unreachable)();
        };

        ProgramSymbolTable.prototype.getLocalsMap = function () {
            return {};
        };

        ProgramSymbolTable.prototype.getEvalInfo = function () {
            return [];
        };

        ProgramSymbolTable.prototype.allocateNamed = function (name) {
            var named = this.named[name];
            if (!named) {
                named = this.named[name] = this.allocate(name);
            }
            return named;
        };

        ProgramSymbolTable.prototype.allocateBlock = function (name) {
            var block = this.blocks[name];
            if (!block) {
                block = this.blocks[name] = this.allocate('&' + name);
            }
            return block;
        };

        ProgramSymbolTable.prototype.allocate = function (identifier) {
            this.symbols.push(identifier);
            return this.size++;
        };

        return ProgramSymbolTable;
    }(SymbolTable);

    var BlockSymbolTable = function (_SymbolTable2) {
        (0, _emberBabel.inherits)(BlockSymbolTable, _SymbolTable2);

        function BlockSymbolTable(parent, symbols, slots) {

            var _this3 = (0, _emberBabel.possibleConstructorReturn)(this, _SymbolTable2.call(this));

            _this3.parent = parent;
            _this3.symbols = symbols;
            _this3.slots = slots;
            return _this3;
        }

        BlockSymbolTable.prototype.has = function (name) {
            return this.symbols.indexOf(name) !== -1 || this.parent.has(name);
        };

        BlockSymbolTable.prototype.get = function (name) {
            var slot = this.symbols.indexOf(name);
            return slot === -1 ? this.parent.get(name) : this.slots[slot];
        };

        BlockSymbolTable.prototype.getLocalsMap = function () {
            var _this4 = this;

            var dict$$1 = this.parent.getLocalsMap();
            this.symbols.forEach(function (symbol) {
                return dict$$1[symbol] = _this4.get(symbol);
            });
            return dict$$1;
        };

        BlockSymbolTable.prototype.getEvalInfo = function () {
            var locals = this.getLocalsMap();
            return Object.keys(locals).map(function (symbol) {
                return locals[symbol];
            });
        };

        BlockSymbolTable.prototype.allocateNamed = function (name) {
            return this.parent.allocateNamed(name);
        };

        BlockSymbolTable.prototype.allocateBlock = function (name) {
            return this.parent.allocateBlock(name);
        };

        BlockSymbolTable.prototype.allocate = function (identifier) {
            return this.parent.allocate(identifier);
        };

        return BlockSymbolTable;
    }(SymbolTable);

    var Frame = function () {

        this.parentNode = null;
        this.children = null;
        this.childIndex = null;
        this.childCount = null;
        this.childTemplateCount = 0;
        this.mustacheCount = 0;
        this.actions = [];
        this.blankChildTextNodes = null;
        this.symbols = null;
    };

    var TemplateVisitor = function () {
        function TemplateVisitor() {

            this.frameStack = [];
            this.actions = [];
            this.programDepth = -1;
        }

        TemplateVisitor.prototype.visit = function (node) {
            this[node.type](node);
        };

        TemplateVisitor.prototype.Program = function (program) {
            var _actions, i;

            this.programDepth++;
            var parentFrame = this.getCurrentFrame();
            var programFrame = this.pushFrame();
            if (!parentFrame) {
                program['symbols'] = SymbolTable.top();
            } else {
                program['symbols'] = parentFrame.symbols.child(program.blockParams);
            }
            var startType = void 0,
                endType = void 0;
            if (this.programDepth === 0) {
                startType = 'startProgram';
                endType = 'endProgram';
            } else {
                startType = 'startBlock';
                endType = 'endBlock';
            }
            programFrame.parentNode = program;
            programFrame.children = program.body;
            programFrame.childCount = program.body.length;
            programFrame.blankChildTextNodes = [];
            programFrame.actions.push([endType, [program, this.programDepth]]);
            programFrame.symbols = program['symbols'];
            for (i = program.body.length - 1; i >= 0; i--) {
                programFrame.childIndex = i;
                this.visit(program.body[i]);
            }
            programFrame.actions.push([startType, [program, programFrame.childTemplateCount, programFrame.blankChildTextNodes.reverse()]]);
            this.popFrame();
            this.programDepth--;
            // Push the completed template into the global actions list
            if (parentFrame) {
                parentFrame.childTemplateCount++;
            }
            (_actions = this.actions).push.apply(_actions, programFrame.actions.reverse());
        };

        TemplateVisitor.prototype.ElementNode = function (element) {
            var _parentFrame$actions, i, _i;

            var parentFrame = this.currentFrame;
            var elementFrame = this.pushFrame();
            elementFrame.parentNode = element;
            elementFrame.children = element.children;
            elementFrame.childCount = element.children.length;
            elementFrame.mustacheCount += element.modifiers.length;
            elementFrame.blankChildTextNodes = [];
            elementFrame.symbols = element['symbols'] = parentFrame.symbols.child(element.blockParams);
            var actionArgs = [element, parentFrame.childIndex, parentFrame.childCount];
            elementFrame.actions.push(['closeElement', actionArgs]);
            for (i = element.attributes.length - 1; i >= 0; i--) {
                this.visit(element.attributes[i]);
            }
            for (_i = element.children.length - 1; _i >= 0; _i--) {
                elementFrame.childIndex = _i;
                this.visit(element.children[_i]);
            }
            var open = ['openElement', [].concat(actionArgs, [elementFrame.mustacheCount, elementFrame.blankChildTextNodes.reverse()])];
            elementFrame.actions.push(open);
            this.popFrame();
            // Propagate the element's frame state to the parent frame
            if (elementFrame.mustacheCount > 0) {
                parentFrame.mustacheCount++;
            }
            parentFrame.childTemplateCount += elementFrame.childTemplateCount;
            (_parentFrame$actions = parentFrame.actions).push.apply(_parentFrame$actions, elementFrame.actions);
        };

        TemplateVisitor.prototype.AttrNode = function (attr) {
            if (attr.value.type !== 'TextNode') {
                this.currentFrame.mustacheCount++;
            }
        };

        TemplateVisitor.prototype.TextNode = function (text) {
            var frame = this.currentFrame;
            if (text.chars === '') {
                frame.blankChildTextNodes.push(domIndexOf(frame.children, text));
            }
            frame.actions.push(['text', [text, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.BlockStatement = function (node) {
            var frame = this.currentFrame;
            frame.mustacheCount++;
            frame.actions.push(['block', [node, frame.childIndex, frame.childCount]]);
            if (node.inverse) {
                this.visit(node.inverse);
            }
            if (node.program) {
                this.visit(node.program);
            }
        };

        TemplateVisitor.prototype.PartialStatement = function (node) {
            var frame = this.currentFrame;
            frame.mustacheCount++;
            frame.actions.push(['mustache', [node, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.CommentStatement = function (text) {
            var frame = this.currentFrame;
            frame.actions.push(['comment', [text, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.MustacheCommentStatement = function () {
            // Intentional empty: Handlebars comments should not affect output.
        };

        TemplateVisitor.prototype.MustacheStatement = function (mustache) {
            var frame = this.currentFrame;
            frame.mustacheCount++;
            frame.actions.push(['mustache', [mustache, frame.childIndex, frame.childCount]]);
        };

        TemplateVisitor.prototype.getCurrentFrame = function () {
            return this.frameStack[this.frameStack.length - 1];
        };

        TemplateVisitor.prototype.pushFrame = function () {
            var frame = new Frame();
            this.frameStack.push(frame);
            return frame;
        };

        TemplateVisitor.prototype.popFrame = function () {
            return this.frameStack.pop();
        };

        (0, _emberBabel.createClass)(TemplateVisitor, [{
            key: 'currentFrame',
            get: function () {
                return this.getCurrentFrame();
            }
        }]);
        return TemplateVisitor;
    }();

    // Returns the index of `domNode` in the `nodes` array, skipping
    // over any nodes which do not represent DOM nodes.
    function domIndexOf(nodes, domNode) {
        var index = -1,
            i,
            node;
        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];

            if (node.type !== 'TextNode' && node.type !== 'ElementNode') {
                continue;
            } else {
                index++;
            }
            if (node === domNode) {
                return index;
            }
        }
        return -1;
    }

    var Block = function () {
        function Block() {

            this.statements = [];
        }

        Block.prototype.push = function (statement) {
            this.statements.push(statement);
        };

        return Block;
    }();

    var InlineBlock = function (_Block) {
        (0, _emberBabel.inherits)(InlineBlock, _Block);

        function InlineBlock(table) {

            var _this5 = (0, _emberBabel.possibleConstructorReturn)(this, _Block.call(this));

            _this5.table = table;
            return _this5;
        }

        InlineBlock.prototype.toJSON = function () {
            return {
                statements: this.statements,
                parameters: this.table.slots
            };
        };

        return InlineBlock;
    }(Block);

    var TemplateBlock = function (_Block2) {
        (0, _emberBabel.inherits)(TemplateBlock, _Block2);

        function TemplateBlock(symbolTable) {

            var _this6 = (0, _emberBabel.possibleConstructorReturn)(this, _Block2.call(this));

            _this6.symbolTable = symbolTable;
            _this6.type = 'template';
            _this6.yields = new _util.DictSet();
            _this6.named = new _util.DictSet();
            _this6.blocks = [];
            _this6.hasEval = false;
            return _this6;
        }

        TemplateBlock.prototype.push = function (statement) {
            this.statements.push(statement);
        };

        TemplateBlock.prototype.toJSON = function () {
            return {
                symbols: this.symbolTable.symbols,
                statements: this.statements,
                hasEval: this.hasEval
            };
        };

        return TemplateBlock;
    }(Block);

    var ComponentBlock = function (_Block3) {
        (0, _emberBabel.inherits)(ComponentBlock, _Block3);

        function ComponentBlock(table) {

            var _this7 = (0, _emberBabel.possibleConstructorReturn)(this, _Block3.call(this));

            _this7.table = table;
            _this7.attributes = [];
            _this7.arguments = [];
            _this7.inParams = true;
            _this7.positionals = [];
            return _this7;
        }

        ComponentBlock.prototype.push = function (statement) {
            if (this.inParams) {
                if ((0, _wireFormat.isModifier)(statement)) {
                    throw new Error('Compile Error: Element modifiers are not allowed in components');
                } else if ((0, _wireFormat.isFlushElement)(statement)) {
                    this.inParams = false;
                } else if ((0, _wireFormat.isArgument)(statement)) {
                    this.arguments.push(statement);
                } else if ((0, _wireFormat.isAttribute)(statement)) {
                    this.attributes.push(statement);
                } else {
                    throw new Error('Compile Error: only parameters allowed before flush-element');
                }
            } else {
                this.statements.push(statement);
            }
        };

        ComponentBlock.prototype.toJSON = function () {
            var args = this.arguments;
            var keys = args.map(function (arg) {
                return arg[1];
            });
            var values = args.map(function (arg) {
                return arg[2];
            });
            return [this.attributes, [keys, values], {
                statements: this.statements,
                parameters: this.table.slots
            }];
        };

        return ComponentBlock;
    }(Block);

    var Template = function () {
        function Template(symbols) {

            this.block = new TemplateBlock(symbols);
        }

        Template.prototype.toJSON = function () {
            return this.block.toJSON();
        };

        return Template;
    }();

    var JavaScriptCompiler = function () {
        function JavaScriptCompiler(opcodes, symbols) {

            this.blocks = new _util.Stack();
            this.values = [];
            this.opcodes = opcodes;
            this.template = new Template(symbols);
        }

        JavaScriptCompiler.process = function (opcodes, symbols) {
            var compiler = new JavaScriptCompiler(opcodes, symbols);
            return compiler.process();
        };

        JavaScriptCompiler.prototype.process = function () {
            var _this8 = this;

            this.opcodes.forEach(function (op) {
                var opcode = op[0];
                var arg = op[1];
                if (!_this8[opcode]) {
                    throw new Error('unimplemented ' + opcode + ' on JavaScriptCompiler');
                }
                _this8[opcode](arg);
            });
            return this.template;
        };

        JavaScriptCompiler.prototype.startBlock = function (program) {
            var block = new InlineBlock(program['symbols']);
            this.blocks.push(block);
        };

        JavaScriptCompiler.prototype.endBlock = function () {
            var template = this.template,
                blocks = this.blocks;

            var block = blocks.pop();
            template.block.blocks.push(block.toJSON());
        };

        JavaScriptCompiler.prototype.startProgram = function () {
            this.blocks.push(this.template.block);
        };

        JavaScriptCompiler.prototype.endProgram = function () {};

        JavaScriptCompiler.prototype.text = function (content) {
            this.push([_wireFormat.Ops.Text, content]);
        };

        JavaScriptCompiler.prototype.append = function (trusted) {
            this.push([_wireFormat.Ops.Append, this.popValue(), trusted]);
        };

        JavaScriptCompiler.prototype.comment = function (value) {
            this.push([_wireFormat.Ops.Comment, value]);
        };

        JavaScriptCompiler.prototype.modifier = function (name) {
            var params = this.popValue();
            var hash = this.popValue();
            this.push([_wireFormat.Ops.Modifier, name, params, hash]);
        };

        JavaScriptCompiler.prototype.block = function (_ref) {
            var name = _ref[0],
                template = _ref[1],
                inverse = _ref[2];

            var params = this.popValue();
            var hash = this.popValue();
            var blocks = this.template.block.blocks;

            this.push([_wireFormat.Ops.Block, name, params, hash, blocks[template], blocks[inverse]]);
        };

        JavaScriptCompiler.prototype.openSplattedElement = function (element) {
            var tag = element.tag;
            if (isComponent(tag)) {
                throw new Error('Compile Error: ...attributes can only be used in an element');
            } else if (element.blockParams.length > 0) {
                throw new Error('Compile Error: <' + element.tag + '> is not a component and doesn\'t support block parameters');
            } else {
                this.push([_wireFormat.Ops.OpenSplattedElement, tag]);
            }
        };

        JavaScriptCompiler.prototype.openElement = function (element) {
            var tag = element.tag;
            if (isComponent(tag)) {
                this.startComponent(element);
            } else if (element.blockParams.length > 0) {
                throw new Error('Compile Error: <' + element.tag + '> is not a component and doesn\'t support block parameters');
            } else {
                this.push([_wireFormat.Ops.OpenElement, tag]);
            }
        };

        JavaScriptCompiler.prototype.flushElement = function () {
            this.push([_wireFormat.Ops.FlushElement]);
        };

        JavaScriptCompiler.prototype.closeElement = function (element) {
            var tag = element.tag,
                _endComponent,
                attrs,
                args,
                block;
            if (isComponent(tag)) {
                _endComponent = this.endComponent(), attrs = _endComponent[0], args = _endComponent[1], block = _endComponent[2];


                this.push([_wireFormat.Ops.Component, tag, attrs, args, block]);
            } else {
                this.push([_wireFormat.Ops.CloseElement]);
            }
        };

        JavaScriptCompiler.prototype.staticAttr = function (_ref2) {
            var name = _ref2[0],
                namespace = _ref2[1];

            var value = this.popValue();
            this.push([_wireFormat.Ops.StaticAttr, name, value, namespace]);
        };

        JavaScriptCompiler.prototype.dynamicAttr = function (_ref3) {
            var name = _ref3[0],
                namespace = _ref3[1];

            var value = this.popValue();
            this.push([_wireFormat.Ops.DynamicAttr, name, value, namespace]);
        };

        JavaScriptCompiler.prototype.trustingAttr = function (_ref4) {
            var name = _ref4[0],
                namespace = _ref4[1];

            var value = this.popValue();
            this.push([_wireFormat.Ops.TrustingAttr, name, value, namespace]);
        };

        JavaScriptCompiler.prototype.staticArg = function (name) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.StaticArg, name, value]);
        };

        JavaScriptCompiler.prototype.dynamicArg = function (name) {
            var value = this.popValue();
            this.push([_wireFormat.Ops.DynamicArg, name, value]);
        };

        JavaScriptCompiler.prototype.yield = function (to) {
            var params = this.popValue();
            this.push([_wireFormat.Ops.Yield, to, params]);
        };

        JavaScriptCompiler.prototype.attrSplat = function (to) {
            this.push([_wireFormat.Ops.AttrSplat, to]);
        };

        JavaScriptCompiler.prototype.debugger = function (evalInfo) {
            this.push([_wireFormat.Ops.Debugger, evalInfo]);
            this.template.block.hasEval = true;
        };

        JavaScriptCompiler.prototype.hasBlock = function (name) {
            this.pushValue([_wireFormat.Ops.HasBlock, name]);
        };

        JavaScriptCompiler.prototype.hasBlockParams = function (name) {
            this.pushValue([_wireFormat.Ops.HasBlockParams, name]);
        };

        JavaScriptCompiler.prototype.partial = function (evalInfo) {
            var params = this.popValue();
            this.push([_wireFormat.Ops.Partial, params[0], evalInfo]);
            this.template.block.hasEval = true;
        };

        JavaScriptCompiler.prototype.literal = function (value) {
            if (value === undefined) {
                this.pushValue([_wireFormat.Ops.Undefined]);
            } else {
                this.pushValue(value);
            }
        };

        JavaScriptCompiler.prototype.unknown = function (name) {
            this.pushValue([_wireFormat.Ops.Unknown, name]);
        };

        JavaScriptCompiler.prototype.get = function (_ref5) {
            var head = _ref5[0],
                path = _ref5[1];

            this.pushValue([_wireFormat.Ops.Get, head, path]);
        };

        JavaScriptCompiler.prototype.maybeLocal = function (path) {
            this.pushValue([_wireFormat.Ops.MaybeLocal, path]);
        };

        JavaScriptCompiler.prototype.concat = function () {
            this.pushValue([_wireFormat.Ops.Concat, this.popValue()]);
        };

        JavaScriptCompiler.prototype.helper = function (name) {
            var params = this.popValue();
            var hash = this.popValue();
            this.pushValue([_wireFormat.Ops.Helper, name, params, hash]);
        };

        JavaScriptCompiler.prototype.startComponent = function (element) {
            var component = new ComponentBlock(element['symbols']);
            this.blocks.push(component);
        };

        JavaScriptCompiler.prototype.endComponent = function () {
            var component = this.blocks.pop();

            return component.toJSON();
        };

        JavaScriptCompiler.prototype.prepareArray = function (size) {
            var values = [],
                i;
            for (i = 0; i < size; i++) {
                values.push(this.popValue());
            }
            this.pushValue(values);
        };

        JavaScriptCompiler.prototype.prepareObject = function (size) {

            var keys = new Array(size),
                i;
            var values = new Array(size);
            for (i = 0; i < size; i++) {
                keys[i] = this.popValue();
                values[i] = this.popValue();
            }
            this.pushValue([keys, values]);
        };

        JavaScriptCompiler.prototype.push = function (args) {
            while (args[args.length - 1] === null) {
                args.pop();
            }
            this.currentBlock.push(args);
        };

        JavaScriptCompiler.prototype.pushValue = function (val) {
            this.values.push(val);
        };

        JavaScriptCompiler.prototype.popValue = function () {

            return this.values.pop();
        };

        (0, _emberBabel.createClass)(JavaScriptCompiler, [{
            key: 'currentBlock',
            get: function () {
                return this.blocks.current;
            }
        }]);
        return JavaScriptCompiler;
    }();

    function isComponent(tag) {
        var open = tag.charAt(0);
        return open === open.toUpperCase();
    }

    // There is a small whitelist of namespaced attributes specially
    // enumerated in
    // https://www.w3.org/TR/html/syntax.html#attributes-0
    //
    // > When a foreign element has one of the namespaced attributes given by
    // > the local name and namespace of the first and second cells of a row
    // > from the following table, it must be written using the name given by
    // > the third cell from the same row.
    //
    // In all other cases, colons are interpreted as a regular character
    // with no special meaning:
    //
    // > No other namespaced attribute can be expressed in the HTML syntax.
    var XLINK = 'http://www.w3.org/1999/xlink';
    var XML = 'http://www.w3.org/XML/1998/namespace';
    var XMLNS = 'http://www.w3.org/2000/xmlns/';
    var WHITELIST = {
        'xlink:actuate': XLINK,
        'xlink:arcrole': XLINK,
        'xlink:href': XLINK,
        'xlink:role': XLINK,
        'xlink:show': XLINK,
        'xlink:title': XLINK,
        'xlink:type': XLINK,
        'xml:base': XML,
        'xml:lang': XML,
        'xml:space': XML,
        xmlns: XMLNS,
        'xmlns:xlink': XMLNS
    };
    function getAttrNamespace(attrName) {
        return WHITELIST[attrName] || null;
    }

    var SymbolAllocator = function () {
        function SymbolAllocator(ops) {

            this.ops = ops;
            this.symbolStack = new _util.Stack();
        }

        SymbolAllocator.prototype.process = function () {
            var out = [],
                i,
                op,
                result;
            var ops = this.ops;

            for (i = 0; i < ops.length; i++) {
                op = ops[i];
                result = this.dispatch(op);

                if (result === undefined) {
                    out.push(op);
                } else {
                    out.push(result);
                }
            }
            return out;
        };

        SymbolAllocator.prototype.dispatch = function (op) {
            var name = op[0];
            var operand = op[1];
            return this[name](operand);
        };

        SymbolAllocator.prototype.startProgram = function (op) {
            this.symbolStack.push(op['symbols']);
        };

        SymbolAllocator.prototype.endProgram = function () {
            this.symbolStack.pop();
        };

        SymbolAllocator.prototype.startBlock = function (op) {
            this.symbolStack.push(op['symbols']);
        };

        SymbolAllocator.prototype.endBlock = function () {
            this.symbolStack.pop();
        };

        SymbolAllocator.prototype.flushElement = function (op) {
            this.symbolStack.push(op['symbols']);
        };

        SymbolAllocator.prototype.closeElement = function () {
            this.symbolStack.pop();
        };

        SymbolAllocator.prototype.attrSplat = function () {
            return ['attrSplat', this.symbols.allocateBlock('attrs')];
        };

        SymbolAllocator.prototype.get = function (op) {
            var name = op[0],
                rest = op[1],
                head,
                _head;

            if (name === 0) {
                return ['get', [0, rest]];
            }
            if (isLocal(name, this.symbols)) {
                head = this.symbols.get(name);

                return ['get', [head, rest]];
            } else if (name[0] === '@') {
                _head = this.symbols.allocateNamed(name);

                return ['get', [_head, rest]];
            } else {
                return ['maybeLocal', [name].concat(rest)];
            }
        };

        SymbolAllocator.prototype.maybeGet = function (op) {
            var name = op[0],
                rest = op[1],
                head,
                _head2;

            if (name === 0) {
                return ['get', [0, rest]];
            }
            if (isLocal(name, this.symbols)) {
                head = this.symbols.get(name);

                return ['get', [head, rest]];
            } else if (name[0] === '@') {
                _head2 = this.symbols.allocateNamed(name);

                return ['get', [_head2, rest]];
            } else if (rest.length === 0) {
                return ['unknown', name];
            } else {
                return ['maybeLocal', [name].concat(rest)];
            }
        };

        SymbolAllocator.prototype.yield = function (op) {
            if (op === 0) {
                throw new Error('Cannot yield to this');
            }
            return ['yield', this.symbols.allocateBlock(op)];
        };

        SymbolAllocator.prototype.debugger = function () {
            return ['debugger', this.symbols.getEvalInfo()];
        };

        SymbolAllocator.prototype.hasBlock = function (op) {
            if (op === 0) {
                throw new Error('Cannot hasBlock this');
            }
            return ['hasBlock', this.symbols.allocateBlock(op)];
        };

        SymbolAllocator.prototype.hasBlockParams = function (op) {
            if (op === 0) {
                throw new Error('Cannot hasBlockParams this');
            }
            return ['hasBlockParams', this.symbols.allocateBlock(op)];
        };

        SymbolAllocator.prototype.partial = function () {
            return ['partial', this.symbols.getEvalInfo()];
        };

        SymbolAllocator.prototype.text = function () {};

        SymbolAllocator.prototype.comment = function () {};

        SymbolAllocator.prototype.openElement = function () {};

        SymbolAllocator.prototype.openSplattedElement = function () {};

        SymbolAllocator.prototype.staticArg = function () {};

        SymbolAllocator.prototype.dynamicArg = function () {};

        SymbolAllocator.prototype.staticAttr = function () {};

        SymbolAllocator.prototype.trustingAttr = function () {};

        SymbolAllocator.prototype.dynamicAttr = function () {};

        SymbolAllocator.prototype.modifier = function () {};

        SymbolAllocator.prototype.append = function () {};

        SymbolAllocator.prototype.block = function () {};

        SymbolAllocator.prototype.literal = function () {};

        SymbolAllocator.prototype.helper = function () {};

        SymbolAllocator.prototype.unknown = function () {};

        SymbolAllocator.prototype.maybeLocal = function () {};

        SymbolAllocator.prototype.prepareArray = function () {};

        SymbolAllocator.prototype.prepareObject = function () {};

        SymbolAllocator.prototype.concat = function () {};

        (0, _emberBabel.createClass)(SymbolAllocator, [{
            key: 'symbols',
            get: function () {
                return this.symbolStack.current;
            }
        }]);
        return SymbolAllocator;
    }();

    function isLocal(name, symbols) {
        return symbols && symbols.has(name);
    }

    function isTrustedValue(value) {
        return value.escaped !== undefined && !value.escaped;
    }

    var TemplateCompiler = function () {
        function TemplateCompiler() {

            this.templateId = 0;
            this.templateIds = [];
            this.opcodes = [];
            this.includeMeta = false;
        }

        TemplateCompiler.compile = function (ast) {
            var templateVisitor = new TemplateVisitor();
            templateVisitor.visit(ast);
            var compiler = new TemplateCompiler();
            var opcodes = compiler.process(templateVisitor.actions);
            var symbols = new SymbolAllocator(opcodes).process();
            return JavaScriptCompiler.process(symbols, ast['symbols']);
        };

        TemplateCompiler.prototype.process = function (actions) {
            var _this9 = this;

            actions.forEach(function (_ref6) {
                var name = _ref6[0],
                    args = _ref6.slice(1);

                if (!_this9[name]) {
                    throw new Error('Unimplemented ' + name + ' on TemplateCompiler');
                }
                _this9[name].apply(_this9, args);
            });
            return this.opcodes;
        };

        TemplateCompiler.prototype.startProgram = function (_ref7) {
            var program = _ref7[0];

            this.opcode(['startProgram', program], program);
        };

        TemplateCompiler.prototype.endProgram = function () {
            this.opcode(['endProgram', null], null);
        };

        TemplateCompiler.prototype.startBlock = function (_ref8) {
            var program = _ref8[0];

            this.templateId++;
            this.opcode(['startBlock', program], program);
        };

        TemplateCompiler.prototype.endBlock = function () {
            this.templateIds.push(this.templateId - 1);
            this.opcode(['endBlock', null], null);
        };

        TemplateCompiler.prototype.text = function (_ref9) {
            var action = _ref9[0];

            this.opcode(['text', action.chars], action);
        };

        TemplateCompiler.prototype.comment = function (_ref10) {
            var action = _ref10[0];

            this.opcode(['comment', action.value], action);
        };

        TemplateCompiler.prototype.openElement = function (_ref11) {
            var action = _ref11[0],
                i,
                attr,
                _i2,
                _i3;

            var attributes = action.attributes;
            var hasSplat = void 0;
            for (i = 0; i < attributes.length; i++) {
                attr = attributes[i];

                if (attr.name === '...attributes') {
                    hasSplat = attr;
                    break;
                }
            }
            if (hasSplat) {
                this.opcode(['openSplattedElement', action], action);
            } else {
                this.opcode(['openElement', action], action);
            }
            var typeAttr = null;
            var attrs = action.attributes;
            for (_i2 = 0; _i2 < attrs.length; _i2++) {
                if (attrs[_i2].name === 'type') {
                    typeAttr = attrs[_i2];
                    continue;
                }
                this.attribute([attrs[_i2]]);
            }
            if (typeAttr) {
                this.attribute([typeAttr]);
            }
            for (_i3 = 0; _i3 < action.modifiers.length; _i3++) {
                this.modifier([action.modifiers[_i3]]);
            }
            this.opcode(['flushElement', action], null);
        };

        TemplateCompiler.prototype.closeElement = function (_ref12) {
            var action = _ref12[0];

            this.opcode(['closeElement', action], action);
        };

        TemplateCompiler.prototype.attribute = function (_ref13) {
            var action = _ref13[0],
                isTrusting;
            var name = action.name,
                value = action.value;

            var namespace = getAttrNamespace(name);
            var isStatic = this.prepareAttributeValue(value);
            if (name.charAt(0) === '@') {
                // Arguments
                if (isStatic) {
                    this.opcode(['staticArg', name], action);
                } else if (action.value.type === 'MustacheStatement') {
                    this.opcode(['dynamicArg', name], action);
                } else {
                    this.opcode(['dynamicArg', name], action);
                }
            } else {
                isTrusting = isTrustedValue(value);

                if (isStatic && name === '...attributes') {
                    this.opcode(['attrSplat', null], action);
                } else if (isStatic) {
                    this.opcode(['staticAttr', [name, namespace]], action);
                } else if (isTrusting) {
                    this.opcode(['trustingAttr', [name, namespace]], action);
                } else if (action.value.type === 'MustacheStatement') {
                    this.opcode(['dynamicAttr', [name, null]], action);
                } else {
                    this.opcode(['dynamicAttr', [name, namespace]], action);
                }
            }
        };

        TemplateCompiler.prototype.modifier = function (_ref14) {
            var action = _ref14[0];

            assertIsSimplePath(action.path, action.loc, 'modifier');
            var parts = action.path.parts;

            this.prepareHelper(action);
            this.opcode(['modifier', parts[0]], action);
        };

        TemplateCompiler.prototype.mustache = function (_ref15) {
            var action = _ref15[0],
                to,
                params;
            var path = action.path;

            if ((0, _syntax.isLiteral)(path)) {
                this.mustacheExpression(action);
                this.opcode(['append', !action.escaped], action);
            } else if (isYield(path)) {
                to = assertValidYield(action);

                this.yield(to, action);
            } else if (isPartial(path)) {
                params = assertValidPartial(action);

                this.partial(params, action);
            } else if (isDebugger(path)) {
                assertValidDebuggerUsage(action);
                this.debugger('debugger', action);
            } else {
                this.mustacheExpression(action);
                this.opcode(['append', !action.escaped], action);
            }
        };

        TemplateCompiler.prototype.block = function (_ref16) {
            var action /*, index, count*/ = _ref16[0];

            this.prepareHelper(action);
            var templateId = this.templateIds.pop();
            var inverseId = action.inverse === null ? null : this.templateIds.pop();
            this.opcode(['block', [action.path.parts[0], templateId, inverseId]], action);
        };

        TemplateCompiler.prototype.arg = function (_ref17) {
            var path = _ref17[0];

            var _path$parts = path.parts,
                head = _path$parts[0],
                rest = _path$parts.slice(1);

            this.opcode(['get', ['@' + head, rest]], path);
        };

        TemplateCompiler.prototype.mustacheExpression = function (expr) {
            var path = expr.path,
                _path$parts2,
                head,
                parts;

            if ((0, _syntax.isLiteral)(path)) {
                this.opcode(['literal', path.value], expr);
            } else if (isBuiltInHelper(path)) {
                this.builtInHelper(expr);
            } else if (isArg(path)) {
                this.arg([path]);
            } else if (isHelperInvocation(expr)) {
                this.prepareHelper(expr);
                this.opcode(['helper', path.parts[0]], expr);
            } else if (path.this) {
                this.opcode(['get', [0, path.parts]], expr);
            } else {
                _path$parts2 = path.parts, head = _path$parts2[0], parts = _path$parts2.slice(1);


                this.opcode(['maybeGet', [head, parts]], expr);
            }
            // } else if (isLocal(path, this.symbols)) {
            //   let [head, ...parts] = path.parts;
            //   this.opcode(['get', [head, parts]], expr);
            // } else if (isSimplePath(path)) {
            //   this.opcode(['unknown', path.parts[0]], expr);
            // } else {
            //   this.opcode(['maybeLocal', path.parts], expr);
            // }
        };

        TemplateCompiler.prototype.yield = function (to, action) {
            this.prepareParams(action.params);
            this.opcode(['yield', to], action);
        };

        TemplateCompiler.prototype.debugger = function (_name, action) {
            this.opcode(['debugger', null], action);
        };

        TemplateCompiler.prototype.hasBlock = function (name, action) {
            this.opcode(['hasBlock', name], action);
        };

        TemplateCompiler.prototype.hasBlockParams = function (name, action) {
            this.opcode(['hasBlockParams', name], action);
        };

        TemplateCompiler.prototype.partial = function (_params, action) {
            this.prepareParams(action.params);
            this.opcode(['partial', null], action);
        };

        TemplateCompiler.prototype.builtInHelper = function (expr) {
            var path = expr.path,
                name,
                _name2;

            if (isHasBlock(path)) {
                name = assertValidHasBlockUsage(expr.path.original, expr);

                this.hasBlock(name, expr);
            } else if (isHasBlockParams(path)) {
                _name2 = assertValidHasBlockUsage(expr.path.original, expr);

                this.hasBlockParams(_name2, expr);
            }
        };

        TemplateCompiler.prototype.SubExpression = function (expr) {
            if (isBuiltInHelper(expr.path)) {
                this.builtInHelper(expr);
            } else {
                this.prepareHelper(expr);
                this.opcode(['helper', expr.path.parts[0]], expr);
            }
        };

        TemplateCompiler.prototype.PathExpression = function (expr) {
            var _expr$parts, head, rest;

            if (expr.data) {
                this.arg([expr]);
            } else {
                _expr$parts = expr.parts, head = _expr$parts[0], rest = _expr$parts.slice(1);


                if (expr.this) {
                    this.opcode(['get', [0, expr.parts]], expr);
                } else {
                    this.opcode(['get', [head, rest]], expr);
                }
            }
        };

        TemplateCompiler.prototype.StringLiteral = function (action) {
            this.opcode(['literal', action.value], action);
        };

        TemplateCompiler.prototype.BooleanLiteral = function (action) {
            this.opcode(['literal', action.value], action);
        };

        TemplateCompiler.prototype.NumberLiteral = function (action) {
            this.opcode(['literal', action.value], action);
        };

        TemplateCompiler.prototype.NullLiteral = function (action) {
            this.opcode(['literal', action.value], action);
        };

        TemplateCompiler.prototype.UndefinedLiteral = function (action) {
            this.opcode(['literal', action.value], action);
        };

        TemplateCompiler.prototype.opcode = function (_opcode) {
            var action = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            // TODO: This doesn't really work
            if (this.includeMeta && action) {
                _opcode.push(this.meta(action));
            }
            this.opcodes.push(_opcode);
        };

        TemplateCompiler.prototype.prepareHelper = function (expr) {
            assertIsSimplePath(expr.path, expr.loc, 'helper');
            var params = expr.params,
                hash = expr.hash;

            this.prepareHash(hash);
            this.prepareParams(params);
        };

        TemplateCompiler.prototype.prepareParams = function (params) {
            var i, param;

            if (!params.length) {
                this.opcode(['literal', null], null);
                return;
            }
            for (i = params.length - 1; i >= 0; i--) {
                param = params[i];


                this[param.type](param);
            }
            this.opcode(['prepareArray', params.length], null);
        };

        TemplateCompiler.prototype.prepareHash = function (hash) {
            var pairs = hash.pairs,
                i,
                _pairs$i,
                key,
                value;
            if (!pairs.length) {
                this.opcode(['literal', null], null);
                return;
            }
            for (i = pairs.length - 1; i >= 0; i--) {
                _pairs$i = pairs[i], key = _pairs$i.key, value = _pairs$i.value;


                this[value.type](value);
                this.opcode(['literal', key], null);
            }
            this.opcode(['prepareObject', pairs.length], null);
        };

        TemplateCompiler.prototype.prepareAttributeValue = function (value) {
            // returns the static value if the value is static
            switch (value.type) {
                case 'TextNode':
                    this.opcode(['literal', value.chars], value);
                    return true;
                case 'MustacheStatement':
                    this.attributeMustache([value]);
                    return false;
                case 'ConcatStatement':
                    this.prepareConcatParts(value.parts);
                    this.opcode(['concat', null], value);
                    return false;
            }
        };

        TemplateCompiler.prototype.prepareConcatParts = function (parts) {
            var i, part;

            for (i = parts.length - 1; i >= 0; i--) {
                part = parts[i];

                if (part.type === 'MustacheStatement') {
                    this.attributeMustache([part]);
                } else if (part.type === 'TextNode') {
                    this.opcode(['literal', part.chars], null);
                }
            }
            this.opcode(['prepareArray', parts.length], null);
        };

        TemplateCompiler.prototype.attributeMustache = function (_ref18) {
            var action = _ref18[0];

            this.mustacheExpression(action);
        };

        TemplateCompiler.prototype.meta = function (node) {
            var loc = node.loc;
            if (!loc) {
                return [];
            }
            var source = loc.source,
                start = loc.start,
                end = loc.end;

            return ['loc', [source || null, [start.line, start.column], [end.line, end.column]]];
        };

        return TemplateCompiler;
    }();

    function isHelperInvocation(mustache) {
        return mustache.params && mustache.params.length > 0 || mustache.hash && mustache.hash.pairs.length > 0;
    }
    function isSimplePath(_ref19) {
        var parts = _ref19.parts;

        return parts.length === 1;
    }
    function isYield(path) {
        return path.original === 'yield';
    }
    function isPartial(path) {
        return path.original === 'partial';
    }
    function isDebugger(path) {
        return path.original === 'debugger';
    }
    function isHasBlock(path) {
        return path.original === 'has-block';
    }
    function isHasBlockParams(path) {
        return path.original === 'has-block-params';
    }
    function isBuiltInHelper(path) {
        return isHasBlock(path) || isHasBlockParams(path);
    }
    function isArg(path) {
        return !!path['data'];
    }
    function assertIsSimplePath(path, loc, context) {
        if (!isSimplePath(path)) {
            throw new _syntax.SyntaxError('`' + path.original + '` is not a valid name for a ' + context + ' on line ' + loc.start.line + '.', path.loc);
        }
    }
    function assertValidYield(statement) {
        var pairs = statement.hash.pairs;

        if (pairs.length === 1 && pairs[0].key !== 'to' || pairs.length > 1) {
            throw new _syntax.SyntaxError('yield only takes a single named argument: \'to\'', statement.loc);
        } else if (pairs.length === 1 && pairs[0].value.type !== 'StringLiteral') {
            throw new _syntax.SyntaxError('you can only yield to a literal value', statement.loc);
        } else if (pairs.length === 0) {
            return 'default';
        } else {
            return pairs[0].value.value;
        }
    }
    function assertValidPartial(statement) {
        var params = statement.params,
            hash = statement.hash,
            escaped = statement.escaped,
            loc = statement.loc;

        if (params && params.length !== 1) {
            throw new _syntax.SyntaxError('Partial found with no arguments. You must specify a template name. (on line ' + loc.start.line + ')', statement.loc);
        } else if (hash && hash.pairs.length > 0) {
            throw new _syntax.SyntaxError('partial does not take any named arguments (on line ' + loc.start.line + ')', statement.loc);
        } else if (!escaped) {
            throw new _syntax.SyntaxError('{{{partial ...}}} is not supported, please use {{partial ...}} instead (on line ' + loc.start.line + ')', statement.loc);
        }
        return params;
    }
    function assertValidHasBlockUsage(type, call) {
        var params = call.params,
            hash = call.hash,
            loc = call.loc,
            param;

        if (hash && hash.pairs.length > 0) {
            throw new _syntax.SyntaxError(type + ' does not take any named arguments', call.loc);
        }
        if (params.length === 0) {
            return 'default';
        } else if (params.length === 1) {
            param = params[0];

            if (param.type === 'StringLiteral') {
                return param.value;
            } else {
                throw new _syntax.SyntaxError('you can only yield to a literal value (on line ' + loc.start.line + ')', call.loc);
            }
        } else {
            throw new _syntax.SyntaxError(type + ' only takes a single positional argument (on line ' + loc.start.line + ')', call.loc);
        }
    }
    function assertValidDebuggerUsage(statement) {
        var params = statement.params,
            hash = statement.hash;

        if (hash && hash.pairs.length > 0) {
            throw new _syntax.SyntaxError('debugger does not take any named arguments', statement.loc);
        }
        if (params.length === 0) {
            return 'default';
        } else {
            throw new _syntax.SyntaxError('debugger does not take any positional arguments', statement.loc);
        }
    }

    var defaultId = function () {
        var crypto, idFn;

        if (typeof _nodeModule.require === 'function') {
            try {
                /* tslint:disable:no-require-imports */
                crypto = (0, _nodeModule.require)('crypto');
                /* tslint:enable:no-require-imports */

                idFn = function (src) {
                    var hash = crypto.createHash('sha1');
                    hash.update(src, 'utf8');
                    // trim to 6 bytes of data (2^48 - 1)
                    return hash.digest('base64').substring(0, 8);
                };

                idFn('test');
                return idFn;
            } catch (e) {}
        }
        return function () {
            return null;
        };
    }();
    var defaultOptions = {
        id: defaultId,
        meta: {}
    };


    exports.defaultId = defaultId;
    exports.precompile = function (string) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOptions;

        var ast = (0, _syntax.preprocess)(string, options);
        var meta = options.meta;

        var _TemplateCompiler$com = TemplateCompiler.compile(ast),
            block = _TemplateCompiler$com.block;

        var idFn = options.id || defaultId;
        var blockJSON = JSON.stringify(block.toJSON());
        var templateJSONObject = {
            id: idFn(JSON.stringify(meta) + blockJSON),
            block: blockJSON,
            meta: meta
        };
        // JSON is javascript
        return JSON.stringify(templateJSONObject);
    };
    exports.TemplateCompiler = TemplateCompiler;
    exports.TemplateVisitor = TemplateVisitor;
});
enifed('@glimmer/reference', ['exports', 'ember-babel', '@glimmer/util'], function (exports, _emberBabel, _util) {
    'use strict';

    exports.isModified = exports.ReferenceCache = exports.map = exports.CachedReference = exports.UpdatableTag = exports.CachedTag = exports.combine = exports.combineSlice = exports.combineTagged = exports.DirtyableTag = exports.bump = exports.isConstTag = exports.isConst = exports.CURRENT_TAG = exports.VOLATILE_TAG = exports.CONSTANT_TAG = exports.TagWrapper = exports.RevisionTag = exports.VOLATILE = exports.INITIAL = exports.CONSTANT = exports.IteratorSynchronizer = exports.ReferenceIterator = exports.IterationArtifacts = exports.ListItem = exports.ConstReference = undefined;

    var CONSTANT = 0;
    var INITIAL = 1;
    var VOLATILE = NaN;

    var RevisionTag = function () {
        function RevisionTag() {}

        RevisionTag.prototype.validate = function (snapshot) {
            return this.value() === snapshot;
        };

        return RevisionTag;
    }();

    RevisionTag.id = 0;
    var VALUE = [];
    var VALIDATE = [];

    var TagWrapper = function () {
        function TagWrapper(type, inner) {

            this.type = type;
            this.inner = inner;
        }

        TagWrapper.prototype.value = function () {
            var func = VALUE[this.type];
            return func(this.inner);
        };

        TagWrapper.prototype.validate = function (snapshot) {
            var func = VALIDATE[this.type];
            return func(this.inner, snapshot);
        };

        return TagWrapper;
    }();

    function register(Type) {
        var type = VALUE.length;
        VALUE.push(function (tag) {
            return tag.value();
        });
        VALIDATE.push(function (tag, snapshot) {
            return tag.validate(snapshot);
        });
        Type.id = type;
    }
    ///
    // CONSTANT: 0
    VALUE.push(function () {
        return CONSTANT;
    });
    VALIDATE.push(function (_tag, snapshot) {
        return snapshot === CONSTANT;
    });
    var CONSTANT_TAG = new TagWrapper(0, null);
    // VOLATILE: 1
    VALUE.push(function () {
        return VOLATILE;
    });
    VALIDATE.push(function (_tag, snapshot) {
        return snapshot === VOLATILE;
    });
    var VOLATILE_TAG = new TagWrapper(1, null);
    // CURRENT: 2
    VALUE.push(function () {
        return $REVISION;
    });
    VALIDATE.push(function (_tag, snapshot) {
        return snapshot === $REVISION;
    });
    var CURRENT_TAG = new TagWrapper(2, null);

    ///
    var $REVISION = INITIAL;
    function bump() {
        $REVISION++;
    }

    var DirtyableTag = function (_RevisionTag) {
        (0, _emberBabel.inherits)(DirtyableTag, _RevisionTag);

        DirtyableTag.create = function () {
            var revision = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : $REVISION;

            return new TagWrapper(this.id, new DirtyableTag(revision));
        };

        function DirtyableTag() {
            var revision = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : $REVISION;


            var _this = (0, _emberBabel.possibleConstructorReturn)(this, _RevisionTag.call(this));

            _this.revision = revision;
            return _this;
        }

        DirtyableTag.prototype.value = function () {
            return this.revision;
        };

        DirtyableTag.prototype.dirty = function () {
            this.revision = ++$REVISION;
        };

        return DirtyableTag;
    }(RevisionTag);

    register(DirtyableTag);

    function _combine(tags) {
        switch (tags.length) {
            case 0:
                return CONSTANT_TAG;
            case 1:
                return tags[0];
            case 2:
                return TagsPair.create(tags[0], tags[1]);
            default:
                return TagsCombinator.create(tags);
        }
    }

    var CachedTag = function (_RevisionTag2) {
        (0, _emberBabel.inherits)(CachedTag, _RevisionTag2);

        function CachedTag() {

            var _this2 = (0, _emberBabel.possibleConstructorReturn)(this, _RevisionTag2.apply(this, arguments));

            _this2.lastChecked = null;
            _this2.lastValue = null;
            return _this2;
        }

        CachedTag.prototype.value = function () {
            var lastChecked = this.lastChecked,
                lastValue = this.lastValue;

            if (lastChecked !== $REVISION) {
                this.lastChecked = $REVISION;
                this.lastValue = lastValue = this.compute();
            }
            return this.lastValue;
        };

        CachedTag.prototype.invalidate = function () {
            this.lastChecked = null;
        };

        return CachedTag;
    }(RevisionTag);

    var TagsPair = function (_CachedTag) {
        (0, _emberBabel.inherits)(TagsPair, _CachedTag);

        TagsPair.create = function (first, second) {
            return new TagWrapper(this.id, new TagsPair(first, second));
        };

        function TagsPair(first, second) {

            var _this3 = (0, _emberBabel.possibleConstructorReturn)(this, _CachedTag.call(this));

            _this3.first = first;
            _this3.second = second;
            return _this3;
        }

        TagsPair.prototype.compute = function () {
            return Math.max(this.first.value(), this.second.value());
        };

        return TagsPair;
    }(CachedTag);

    register(TagsPair);

    var TagsCombinator = function (_CachedTag2) {
        (0, _emberBabel.inherits)(TagsCombinator, _CachedTag2);

        TagsCombinator.create = function (tags) {
            return new TagWrapper(this.id, new TagsCombinator(tags));
        };

        function TagsCombinator(tags) {

            var _this4 = (0, _emberBabel.possibleConstructorReturn)(this, _CachedTag2.call(this));

            _this4.tags = tags;
            return _this4;
        }

        TagsCombinator.prototype.compute = function () {
            var tags = this.tags,
                i,
                value;

            var max = -1;
            for (i = 0; i < tags.length; i++) {
                value = tags[i].value();

                max = Math.max(value, max);
            }
            return max;
        };

        return TagsCombinator;
    }(CachedTag);

    register(TagsCombinator);

    var UpdatableTag = function (_CachedTag3) {
        (0, _emberBabel.inherits)(UpdatableTag, _CachedTag3);

        UpdatableTag.create = function (tag) {
            return new TagWrapper(this.id, new UpdatableTag(tag));
        };

        function UpdatableTag(tag) {

            var _this5 = (0, _emberBabel.possibleConstructorReturn)(this, _CachedTag3.call(this));

            _this5.tag = tag;
            _this5.lastUpdated = INITIAL;
            return _this5;
        }

        UpdatableTag.prototype.compute = function () {
            return Math.max(this.lastUpdated, this.tag.value());
        };

        UpdatableTag.prototype.update = function (tag) {
            if (tag !== this.tag) {
                this.tag = tag;
                this.lastUpdated = $REVISION;
                this.invalidate();
            }
        };

        return UpdatableTag;
    }(CachedTag);

    register(UpdatableTag);

    var CachedReference = function () {
        function CachedReference() {

            this.lastRevision = null;
            this.lastValue = null;
        }

        CachedReference.prototype.value = function () {
            var tag = this.tag,
                lastRevision = this.lastRevision,
                lastValue = this.lastValue;

            if (lastRevision === null || !tag.validate(lastRevision)) {
                lastValue = this.lastValue = this.compute();
                this.lastRevision = tag.value();
            }
            return lastValue;
        };

        CachedReference.prototype.invalidate = function () {
            this.lastRevision = null;
        };

        return CachedReference;
    }();

    var MapperReference = function (_CachedReference) {
        (0, _emberBabel.inherits)(MapperReference, _CachedReference);

        function MapperReference(reference, mapper) {

            var _this6 = (0, _emberBabel.possibleConstructorReturn)(this, _CachedReference.call(this));

            _this6.tag = reference.tag;
            _this6.reference = reference;
            _this6.mapper = mapper;
            return _this6;
        }

        MapperReference.prototype.compute = function () {
            var reference = this.reference,
                mapper = this.mapper;

            return mapper(reference.value());
        };

        return MapperReference;
    }(CachedReference);

    //////////

    var ReferenceCache = function () {
        function ReferenceCache(reference) {

            this.lastValue = null;
            this.lastRevision = null;
            this.initialized = false;
            this.tag = reference.tag;
            this.reference = reference;
        }

        ReferenceCache.prototype.peek = function () {
            if (!this.initialized) {
                return this.initialize();
            }
            return this.lastValue;
        };

        ReferenceCache.prototype.revalidate = function () {
            if (!this.initialized) {
                return this.initialize();
            }
            var reference = this.reference,
                lastRevision = this.lastRevision;

            var tag = reference.tag;
            if (tag.validate(lastRevision)) return NOT_MODIFIED;
            this.lastRevision = tag.value();
            var lastValue = this.lastValue;

            var value = reference.value();
            if (value === lastValue) return NOT_MODIFIED;
            this.lastValue = value;
            return value;
        };

        ReferenceCache.prototype.initialize = function () {
            var reference = this.reference;

            var value = this.lastValue = reference.value();
            this.lastRevision = reference.tag.value();
            this.initialized = true;
            return value;
        };

        return ReferenceCache;
    }();

    var NOT_MODIFIED = 'adb3b78e-3d22-4e4b-877a-6317c2c5c145';


    var ConstReference = function () {
        function ConstReference(inner) {

            this.inner = inner;
            this.tag = CONSTANT_TAG;
        }

        ConstReference.prototype.value = function () {
            return this.inner;
        };

        return ConstReference;
    }();

    var ListItem = function (_ListNode) {
        (0, _emberBabel.inherits)(ListItem, _ListNode);

        function ListItem(iterable, result) {

            var _this7 = (0, _emberBabel.possibleConstructorReturn)(this, _ListNode.call(this, iterable.valueReferenceFor(result)));

            _this7.retained = false;
            _this7.seen = false;
            _this7.key = result.key;
            _this7.iterable = iterable;
            _this7.memo = iterable.memoReferenceFor(result);
            return _this7;
        }

        ListItem.prototype.update = function (item) {
            this.retained = true;
            this.iterable.updateValueReference(this.value, item);
            this.iterable.updateMemoReference(this.memo, item);
        };

        ListItem.prototype.shouldRemove = function () {
            return !this.retained;
        };

        ListItem.prototype.reset = function () {
            this.retained = false;
            this.seen = false;
        };

        return ListItem;
    }(_util.ListNode);

    var IterationArtifacts = function () {
        function IterationArtifacts(iterable) {

            this.iterator = null;
            this.map = (0, _util.dict)();
            this.list = new _util.LinkedList();
            this.tag = iterable.tag;
            this.iterable = iterable;
        }

        IterationArtifacts.prototype.isEmpty = function () {
            var iterator = this.iterator = this.iterable.iterate();
            return iterator.isEmpty();
        };

        IterationArtifacts.prototype.iterate = function () {
            var iterator = void 0;
            if (this.iterator === null) {
                iterator = this.iterable.iterate();
            } else {
                iterator = this.iterator;
            }
            this.iterator = null;
            return iterator;
        };

        IterationArtifacts.prototype.has = function (key) {
            return !!this.map[key];
        };

        IterationArtifacts.prototype.get = function (key) {
            return this.map[key];
        };

        IterationArtifacts.prototype.wasSeen = function (key) {
            var node = this.map[key];
            return node !== undefined && node.seen;
        };

        IterationArtifacts.prototype.append = function (item) {
            var map = this.map,
                list = this.list,
                iterable = this.iterable;

            var node = map[item.key] = new ListItem(iterable, item);
            list.append(node);
            return node;
        };

        IterationArtifacts.prototype.insertBefore = function (item, reference) {
            var map = this.map,
                list = this.list,
                iterable = this.iterable;

            var node = map[item.key] = new ListItem(iterable, item);
            node.retained = true;
            list.insertBefore(node, reference);
            return node;
        };

        IterationArtifacts.prototype.move = function (item, reference) {
            var list = this.list;

            item.retained = true;
            list.remove(item);
            list.insertBefore(item, reference);
        };

        IterationArtifacts.prototype.remove = function (item) {
            var list = this.list;

            list.remove(item);
            delete this.map[item.key];
        };

        IterationArtifacts.prototype.nextNode = function (item) {
            return this.list.nextNode(item);
        };

        IterationArtifacts.prototype.head = function () {
            return this.list.head();
        };

        return IterationArtifacts;
    }();

    var ReferenceIterator = function () {
        // if anyone needs to construct this object with something other than
        // an iterable, let @wycats know.
        function ReferenceIterator(iterable) {

            this.iterator = null;
            var artifacts = new IterationArtifacts(iterable);
            this.artifacts = artifacts;
        }

        ReferenceIterator.prototype.next = function () {
            var artifacts = this.artifacts;

            var iterator = this.iterator = this.iterator || artifacts.iterate();
            var item = iterator.next();
            if (item === null) return null;
            return artifacts.append(item);
        };

        return ReferenceIterator;
    }();

    var Phase;
    (function (Phase) {
        Phase[Phase["Append"] = 0] = "Append";
        Phase[Phase["Prune"] = 1] = "Prune";
        Phase[Phase["Done"] = 2] = "Done";
    })(Phase || (Phase = {}));

    var IteratorSynchronizer = function () {
        function IteratorSynchronizer(_ref2) {
            var target = _ref2.target,
                artifacts = _ref2.artifacts;


            this.target = target;
            this.artifacts = artifacts;
            this.iterator = artifacts.iterate();
            this.current = artifacts.head();
        }

        IteratorSynchronizer.prototype.sync = function () {
            var phase = Phase.Append;
            while (true) {
                switch (phase) {
                    case Phase.Append:
                        phase = this.nextAppend();
                        break;
                    case Phase.Prune:
                        phase = this.nextPrune();
                        break;
                    case Phase.Done:
                        this.nextDone();
                        return;
                }
            }
        };

        IteratorSynchronizer.prototype.advanceToKey = function (key) {
            var current = this.current,
                artifacts = this.artifacts;

            var seek = current;
            while (seek !== null && seek.key !== key) {
                seek.seen = true;
                seek = artifacts.nextNode(seek);
            }
            if (seek !== null) {
                this.current = artifacts.nextNode(seek);
            }
        };

        IteratorSynchronizer.prototype.nextAppend = function () {
            var iterator = this.iterator,
                current = this.current,
                artifacts = this.artifacts;

            var item = iterator.next();
            if (item === null) {
                return this.startPrune();
            }
            var key = item.key;

            if (current !== null && current.key === key) {
                this.nextRetain(item);
            } else if (artifacts.has(key)) {
                this.nextMove(item);
            } else {
                this.nextInsert(item);
            }
            return Phase.Append;
        };

        IteratorSynchronizer.prototype.nextRetain = function (item) {
            var artifacts = this.artifacts,
                current = this.current;

            current = current;
            current.update(item);
            this.current = artifacts.nextNode(current);
            this.target.retain(item.key, current.value, current.memo);
        };

        IteratorSynchronizer.prototype.nextMove = function (item) {
            var current = this.current,
                artifacts = this.artifacts,
                target = this.target;
            var key = item.key;

            var found = artifacts.get(item.key);
            found.update(item);
            if (artifacts.wasSeen(item.key)) {
                artifacts.move(found, current);
                target.move(found.key, found.value, found.memo, current ? current.key : null);
            } else {
                this.advanceToKey(key);
            }
        };

        IteratorSynchronizer.prototype.nextInsert = function (item) {
            var artifacts = this.artifacts,
                target = this.target,
                current = this.current;

            var node = artifacts.insertBefore(item, current);
            target.insert(node.key, node.value, node.memo, current ? current.key : null);
        };

        IteratorSynchronizer.prototype.startPrune = function () {
            this.current = this.artifacts.head();
            return Phase.Prune;
        };

        IteratorSynchronizer.prototype.nextPrune = function () {
            var artifacts = this.artifacts,
                target = this.target,
                current = this.current;

            if (current === null) {
                return Phase.Done;
            }
            var node = current;
            this.current = artifacts.nextNode(node);
            if (node.shouldRemove()) {
                artifacts.remove(node);
                target.delete(node.key);
            } else {
                node.reset();
            }
            return Phase.Prune;
        };

        IteratorSynchronizer.prototype.nextDone = function () {
            this.target.done();
        };

        return IteratorSynchronizer;
    }();

    exports.ConstReference = ConstReference;
    exports.ListItem = ListItem;
    exports.IterationArtifacts = IterationArtifacts;
    exports.ReferenceIterator = ReferenceIterator;
    exports.IteratorSynchronizer = IteratorSynchronizer;
    exports.CONSTANT = CONSTANT;
    exports.INITIAL = INITIAL;
    exports.VOLATILE = VOLATILE;
    exports.RevisionTag = RevisionTag;
    exports.TagWrapper = TagWrapper;
    exports.CONSTANT_TAG = CONSTANT_TAG;
    exports.VOLATILE_TAG = VOLATILE_TAG;
    exports.CURRENT_TAG = CURRENT_TAG;
    exports.isConst = function (_ref) {
        var tag = _ref.tag;

        return tag === CONSTANT_TAG;
    };
    exports.isConstTag = function (tag) {
        return tag === CONSTANT_TAG;
    };
    exports.bump = bump;
    exports.DirtyableTag = DirtyableTag;
    exports.combineTagged = function (tagged) {
        var optimized = [],
            i,
            l,
            tag;
        for (i = 0, l = tagged.length; i < l; i++) {
            tag = tagged[i].tag;

            if (tag === VOLATILE_TAG) return VOLATILE_TAG;
            if (tag === CONSTANT_TAG) continue;
            optimized.push(tag);
        }
        return _combine(optimized);
    };
    exports.combineSlice = function (slice) {
        var optimized = [],
            tag;
        var node = slice.head();
        while (node !== null) {
            tag = node.tag;

            if (tag === VOLATILE_TAG) return VOLATILE_TAG;
            if (tag !== CONSTANT_TAG) optimized.push(tag);
            node = slice.nextNode(node);
        }
        return _combine(optimized);
    };
    exports.combine = function (tags) {
        var optimized = [],
            i,
            l,
            tag;
        for (i = 0, l = tags.length; i < l; i++) {
            tag = tags[i];

            if (tag === VOLATILE_TAG) return VOLATILE_TAG;
            if (tag === CONSTANT_TAG) continue;
            optimized.push(tag);
        }
        return _combine(optimized);
    };
    exports.CachedTag = CachedTag;
    exports.UpdatableTag = UpdatableTag;
    exports.CachedReference = CachedReference;
    exports.map = function (reference, mapper) {
        return new MapperReference(reference, mapper);
    };
    exports.ReferenceCache = ReferenceCache;
    exports.isModified = function (value) {
        return value !== NOT_MODIFIED;
    };
});
enifed('@glimmer/syntax', ['exports', 'ember-babel', 'simple-html-tokenizer', '@glimmer/util', 'handlebars'], function (exports, _emberBabel, _simpleHtmlTokenizer, _util, _handlebars) {
    'use strict';

    exports.printLiteral = exports.isLiteral = exports.SyntaxError = exports.print = exports.Walker = exports.traverse = exports.cannotReplaceOrRemoveInKeyHandlerYet = exports.cannotReplaceNode = exports.cannotRemoveNode = exports.TraversalError = exports.builders = exports.preprocess = exports.AST = undefined;

    function isLiteral(input) {
        return !!(typeof input === 'object' && input.type.match(/Literal$/));
    }

    var nodes = /*#__PURE__*/Object.freeze({
        isCall: function (node) {
            return node.type === 'SubExpression' || node.type === 'MustacheStatement' && node.path.type === 'PathExpression';
        },
        isLiteral: isLiteral
    });
    // Expressions

    function buildPath(original, loc) {
        if (typeof original !== 'string') return original;
        var parts = original.split('.');
        var thisHead = false;
        if (parts[0] === 'this') {
            thisHead = true;
            parts = parts.slice(1);
        }
        return {
            type: 'PathExpression',
            original: original,
            this: thisHead,
            parts: parts,
            data: false,
            loc: buildLoc(loc || null)
        };
    }
    function buildLiteral(type, value, loc) {
        return {
            type: type,
            value: value,
            original: value,
            loc: buildLoc(loc || null)
        };
    }
    // Miscellaneous
    function buildHash(pairs, loc) {
        return {
            type: 'Hash',
            pairs: pairs || [],
            loc: buildLoc(loc || null)
        };
    }

    function buildSource(source) {
        return source || null;
    }
    function buildPosition(line, column) {
        return {
            line: line,
            column: column
        };
    }
    var SYNTHETIC = {
        source: '(synthetic)',
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 }
    };
    function buildLoc() {
        var _len, args, _key, loc, startLine, startColumn, endLine, endColumn, source;

        for (_len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        if (args.length === 1) {
            loc = args[0];

            if (loc && typeof loc === 'object') {
                return {
                    source: buildSource(loc.source),
                    start: buildPosition(loc.start.line, loc.start.column),
                    end: buildPosition(loc.end.line, loc.end.column)
                };
            } else {
                return SYNTHETIC;
            }
        } else {
            startLine = args[0], startColumn = args[1], endLine = args[2], endColumn = args[3], source = args[4];


            return {
                source: buildSource(source),
                start: buildPosition(startLine, startColumn),
                end: buildPosition(endLine, endColumn)
            };
        }
    }
    var b = {
        mustache: function (path, params, hash, raw, loc) {
            if (!isLiteral(path)) {
                path = buildPath(path);
            }
            return {
                type: 'MustacheStatement',
                path: path,
                params: params || [],
                hash: hash || buildHash([]),
                escaped: !raw,
                loc: buildLoc(loc || null)
            };
        },
        block: function (path, params, hash, program, inverse, loc) {
            return {
                type: 'BlockStatement',
                path: buildPath(path),
                params: params || [],
                hash: hash || buildHash([]),
                program: program || null,
                inverse: inverse || null,
                loc: buildLoc(loc || null)
            };
        },
        partial: function (name, params, hash, indent, loc) {
            return {
                type: 'PartialStatement',
                name: name,
                params: params || [],
                hash: hash || buildHash([]),
                indent: indent || '',
                strip: { open: false, close: false },
                loc: buildLoc(loc || null)
            };
        },
        comment: function (value, loc) {
            return {
                type: 'CommentStatement',
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        mustacheComment: function (value, loc) {
            return {
                type: 'MustacheCommentStatement',
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        element: function (tag, attributes, modifiers, children, comments, loc) {
            // this is used for backwards compat prior to `comments` being added to the AST
            if (!Array.isArray(comments)) {
                loc = comments;
                comments = [];
            }
            // this is used for backwards compat, prior to `selfClosing` being part of the ElementNode AST
            var selfClosing = false;
            if (typeof tag === 'object') {
                selfClosing = tag.selfClosing;
                tag = tag.name;
            }
            return {
                type: 'ElementNode',
                tag: tag || '',
                selfClosing: selfClosing,
                attributes: attributes || [],
                blockParams: [],
                modifiers: modifiers || [],
                comments: comments || [],
                children: children || [],
                loc: buildLoc(loc || null)
            };
        },
        elementModifier: function (path, params, hash, loc) {
            return {
                type: 'ElementModifierStatement',
                path: buildPath(path),
                params: params || [],
                hash: hash || buildHash([]),
                loc: buildLoc(loc || null)
            };
        },
        attr: function (name, value, loc) {
            return {
                type: 'AttrNode',
                name: name,
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        text: function (chars, loc) {
            return {
                type: 'TextNode',
                chars: chars || '',
                loc: buildLoc(loc || null)
            };
        },
        sexpr: function (path, params, hash, loc) {
            return {
                type: 'SubExpression',
                path: buildPath(path),
                params: params || [],
                hash: hash || buildHash([]),
                loc: buildLoc(loc || null)
            };
        },
        path: buildPath,
        concat: function (parts, loc) {
            return {
                type: 'ConcatStatement',
                parts: parts || [],
                loc: buildLoc(loc || null)
            };
        },
        hash: buildHash,
        pair: function (key, value, loc) {
            return {
                type: 'HashPair',
                key: key,
                value: value,
                loc: buildLoc(loc || null)
            };
        },
        literal: buildLiteral,
        program: function (body, blockParams, loc) {
            return {
                type: 'Program',
                body: body || [],
                blockParams: blockParams || [],
                loc: buildLoc(loc || null)
            };
        },
        loc: buildLoc,
        pos: buildPosition,
        string: literal('StringLiteral'),
        boolean: literal('BooleanLiteral'),
        number: literal('NumberLiteral'),
        undefined: function () {
            return buildLiteral('UndefinedLiteral', undefined);
        },
        null: function () {
            return buildLiteral('NullLiteral', null);
        }
    };
    function literal(type) {
        return function (value) {
            return buildLiteral(type, value);
        };
    }

    /**
     * Subclass of `Error` with additional information
     * about location of incorrect markup.
     */
    var SyntaxError = function () {
        SyntaxError.prototype = Object.create(Error.prototype);
        SyntaxError.prototype.constructor = SyntaxError;
        function SyntaxError(message, location) {
            var error = Error.call(this, message);
            this.message = message;
            this.stack = error.stack;
            this.location = location;
        }
        return SyntaxError;
    }();

    // Regex to validate the identifier for block parameters.
    // Based on the ID validation regex in Handlebars.
    var ID_INVERSE_PATTERN = /[!"#%-,\.\/;->@\[-\^`\{-~]/;
    // Checks the element's attributes to see if it uses block params.
    // If it does, registers the block params with the program and
    // removes the corresponding attributes from the element.
    function parseElementBlockParams(element) {
        var params = parseBlockParams(element);
        if (params) element.blockParams = params;
    }
    function parseBlockParams(element) {
        var l = element.attributes.length,
            i,
            paramsString,
            params,
            _i,
            param;
        var attrNames = [];
        for (i = 0; i < l; i++) {
            attrNames.push(element.attributes[i].name);
        }
        var asIndex = attrNames.indexOf('as');
        if (asIndex !== -1 && l > asIndex && attrNames[asIndex + 1].charAt(0) === '|') {
            // Some basic validation, since we're doing the parsing ourselves
            paramsString = attrNames.slice(asIndex).join(' ');

            if (paramsString.charAt(paramsString.length - 1) !== '|' || paramsString.match(/\|/g).length !== 2) {
                throw new SyntaxError("Invalid block parameters syntax: '" + paramsString + "'", element.loc);
            }
            params = [];

            for (_i = asIndex + 1; _i < l; _i++) {
                param = attrNames[_i].replace(/\|/g, '');

                if (param !== '') {
                    if (ID_INVERSE_PATTERN.test(param)) {
                        throw new SyntaxError("Invalid identifier for block parameters: '" + param + "' in '" + paramsString + "'", element.loc);
                    }
                    params.push(param);
                }
            }
            if (params.length === 0) {
                throw new SyntaxError("Cannot use zero block parameters: '" + paramsString + "'", element.loc);
            }
            element.attributes = element.attributes.slice(0, asIndex);
            return params;
        }
        return null;
    }
    function childrenFor(node) {
        switch (node.type) {
            case 'Program':
                return node.body;
            case 'ElementNode':
                return node.children;
        }
    }
    function appendChild(parent, node) {
        childrenFor(parent).push(node);
    }
    function isLiteral$1(path) {
        return path.type === 'StringLiteral' || path.type === 'BooleanLiteral' || path.type === 'NumberLiteral' || path.type === 'NullLiteral' || path.type === 'UndefinedLiteral';
    }
    function printLiteral(literal) {
        if (literal.type === 'UndefinedLiteral') {
            return 'undefined';
        } else {
            return JSON.stringify(literal.value);
        }
    }

    var entityParser = new _simpleHtmlTokenizer.EntityParser(_simpleHtmlTokenizer.HTML5NamedCharRefs);

    var Parser = function () {
        function Parser(source) {

            this.elementStack = [];
            this.currentAttribute = null;
            this.currentNode = null;
            this.tokenizer = new _simpleHtmlTokenizer.EventedTokenizer(this, entityParser);
            this.source = source.split(/(?:\r\n?|\n)/g);
        }

        Parser.prototype.acceptNode = function (node) {
            return this[node.type](node);
        };

        Parser.prototype.currentElement = function () {
            return this.elementStack[this.elementStack.length - 1];
        };

        Parser.prototype.sourceForNode = function (node, endNode) {
            var firstLine = node.loc.start.line - 1;
            var currentLine = firstLine - 1;
            var firstColumn = node.loc.start.column;
            var string = [];
            var line = void 0;
            var lastLine = void 0;
            var lastColumn = void 0;
            if (endNode) {
                lastLine = endNode.loc.end.line - 1;
                lastColumn = endNode.loc.end.column;
            } else {
                lastLine = node.loc.end.line - 1;
                lastColumn = node.loc.end.column;
            }
            while (currentLine < lastLine) {
                currentLine++;
                line = this.source[currentLine];
                if (currentLine === firstLine) {
                    if (firstLine === lastLine) {
                        string.push(line.slice(firstColumn, lastColumn));
                    } else {
                        string.push(line.slice(firstColumn));
                    }
                } else if (currentLine === lastLine) {
                    string.push(line.slice(0, lastColumn));
                } else {
                    string.push(line);
                }
            }
            return string.join('\n');
        };

        (0, _emberBabel.createClass)(Parser, [{
            key: 'currentAttr',
            get: function () {
                return this.currentAttribute;
            }
        }, {
            key: 'currentTag',
            get: function () {
                var node = this.currentNode;

                return node;
            }
        }, {
            key: 'currentStartTag',
            get: function () {
                var node = this.currentNode;

                return node;
            }
        }, {
            key: 'currentEndTag',
            get: function () {
                var node = this.currentNode;

                return node;
            }
        }, {
            key: 'currentComment',
            get: function () {
                var node = this.currentNode;

                return node;
            }
        }, {
            key: 'currentData',
            get: function () {
                var node = this.currentNode;

                return node;
            }
        }]);
        return Parser;
    }();

    var HandlebarsNodeVisitors = function (_Parser) {
        (0, _emberBabel.inherits)(HandlebarsNodeVisitors, _Parser);

        function HandlebarsNodeVisitors() {

            var _this = (0, _emberBabel.possibleConstructorReturn)(this, _Parser.apply(this, arguments));

            _this.cursorCount = 0;
            return _this;
        }

        HandlebarsNodeVisitors.prototype.cursor = function () {
            return '%cursor:' + this.cursorCount++ + '%';
        };

        HandlebarsNodeVisitors.prototype.Program = function (program) {
            this.cursorCount = 0;
            var node = b.program([], program.blockParams, program.loc),
                elementNode;
            var i = void 0,
                l = program.body.length;
            this.elementStack.push(node);
            if (l === 0) {
                return this.elementStack.pop();
            }
            for (i = 0; i < l; i++) {
                this.acceptNode(program.body[i]);
            }
            // Ensure that that the element stack is balanced properly.
            var poppedNode = this.elementStack.pop();
            if (poppedNode !== node) {
                elementNode = poppedNode;

                throw new SyntaxError('Unclosed element `' + elementNode.tag + '` (on line ' + elementNode.loc.start.line + ').', elementNode.loc);
            }
            return node;
        };

        HandlebarsNodeVisitors.prototype.BlockStatement = function (block) {
            if (this.tokenizer['state'] === 'comment') {
                this.appendToCommentData(this.sourceForNode(block));
                return;
            }
            if (this.tokenizer['state'] !== 'comment' && this.tokenizer['state'] !== 'data' && this.tokenizer['state'] !== 'beforeData') {
                throw new SyntaxError('A block may only be used inside an HTML element or another block.', block.loc);
            }

            var _acceptCallNodes = acceptCallNodes(this, block),
                path = _acceptCallNodes.path,
                params = _acceptCallNodes.params,
                hash = _acceptCallNodes.hash;

            var program = this.Program(block.program);
            var inverse = block.inverse ? this.Program(block.inverse) : null;
            if (path.original === 'in-element') {
                hash = addInElementHash(this.cursor(), hash, block.loc);
            }
            var node = b.block(path, params, hash, program, inverse, block.loc);
            var parentProgram = this.currentElement();
            appendChild(parentProgram, node);
        };

        HandlebarsNodeVisitors.prototype.MustacheStatement = function (rawMustache) {
            var tokenizer = this.tokenizer,
                _acceptCallNodes2,
                path,
                params,
                hash;

            if (tokenizer['state'] === 'comment') {
                this.appendToCommentData(this.sourceForNode(rawMustache));
                return;
            }
            var mustache = void 0;
            var escaped = rawMustache.escaped,
                loc = rawMustache.loc;

            if (rawMustache.path.type.match(/Literal$/)) {
                mustache = {
                    type: 'MustacheStatement',
                    path: this.acceptNode(rawMustache.path),
                    params: [],
                    hash: b.hash(),
                    escaped: escaped,
                    loc: loc
                };
            } else {
                _acceptCallNodes2 = acceptCallNodes(this, rawMustache), path = _acceptCallNodes2.path, params = _acceptCallNodes2.params, hash = _acceptCallNodes2.hash;


                mustache = b.mustache(path, params, hash, !escaped, loc);
            }
            switch (tokenizer.state) {
                // Tag helpers
                case "tagName" /* tagName */:
                    addElementModifier(this.currentStartTag, mustache);
                    tokenizer.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    break;
                case "beforeAttributeName" /* beforeAttributeName */:
                    addElementModifier(this.currentStartTag, mustache);
                    break;
                case "attributeName" /* attributeName */:
                case "afterAttributeName" /* afterAttributeName */:
                    this.beginAttributeValue(false);
                    this.finishAttributeValue();
                    addElementModifier(this.currentStartTag, mustache);
                    tokenizer.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    break;
                case "afterAttributeValueQuoted" /* afterAttributeValueQuoted */:
                    addElementModifier(this.currentStartTag, mustache);
                    tokenizer.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    break;
                // Attribute values
                case "beforeAttributeValue" /* beforeAttributeValue */:
                    this.beginAttributeValue(false);
                    appendDynamicAttributeValuePart(this.currentAttribute, mustache);
                    tokenizer.transitionTo("attributeValueUnquoted" /* attributeValueUnquoted */);
                    break;
                case "attributeValueDoubleQuoted" /* attributeValueDoubleQuoted */:
                case "attributeValueSingleQuoted" /* attributeValueSingleQuoted */:
                case "attributeValueUnquoted" /* attributeValueUnquoted */:
                    appendDynamicAttributeValuePart(this.currentAttribute, mustache);
                    break;
                // TODO: Only append child when the tokenizer state makes
                // sense to do so, otherwise throw an error.
                default:
                    appendChild(this.currentElement(), mustache);
            }
            return mustache;
        };

        HandlebarsNodeVisitors.prototype.ContentStatement = function (content) {
            updateTokenizerLocation(this.tokenizer, content);
            this.tokenizer.tokenizePart(content.value);
            this.tokenizer.flushData();
        };

        HandlebarsNodeVisitors.prototype.CommentStatement = function (rawComment) {
            var tokenizer = this.tokenizer;

            if (tokenizer.state === "comment" /* comment */) {
                    this.appendToCommentData(this.sourceForNode(rawComment));
                    return null;
                }
            var value = rawComment.value,
                loc = rawComment.loc;

            var comment = b.mustacheComment(value, loc);
            switch (tokenizer.state) {
                case "beforeAttributeName" /* beforeAttributeName */:
                    this.currentStartTag.comments.push(comment);
                    break;
                case "beforeData" /* beforeData */:
                case "data" /* data */:
                    appendChild(this.currentElement(), comment);
                    break;
                default:
                    throw new SyntaxError('Using a Handlebars comment when in the `' + tokenizer['state'] + '` state is not supported: "' + comment.value + '" on line ' + loc.start.line + ':' + loc.start.column, rawComment.loc);
            }
            return comment;
        };

        HandlebarsNodeVisitors.prototype.PartialStatement = function (partial) {
            var loc = partial.loc;

            throw new SyntaxError('Handlebars partials are not supported: "' + this.sourceForNode(partial, partial.name) + '" at L' + loc.start.line + ':C' + loc.start.column, partial.loc);
        };

        HandlebarsNodeVisitors.prototype.PartialBlockStatement = function (partialBlock) {
            var loc = partialBlock.loc;

            throw new SyntaxError('Handlebars partial blocks are not supported: "' + this.sourceForNode(partialBlock, partialBlock.name) + '" at L' + loc.start.line + ':C' + loc.start.column, partialBlock.loc);
        };

        HandlebarsNodeVisitors.prototype.Decorator = function (decorator) {
            var loc = decorator.loc;

            throw new SyntaxError('Handlebars decorators are not supported: "' + this.sourceForNode(decorator, decorator.path) + '" at L' + loc.start.line + ':C' + loc.start.column, decorator.loc);
        };

        HandlebarsNodeVisitors.prototype.DecoratorBlock = function (decoratorBlock) {
            var loc = decoratorBlock.loc;

            throw new SyntaxError('Handlebars decorator blocks are not supported: "' + this.sourceForNode(decoratorBlock, decoratorBlock.path) + '" at L' + loc.start.line + ':C' + loc.start.column, decoratorBlock.loc);
        };

        HandlebarsNodeVisitors.prototype.SubExpression = function (sexpr) {
            var _acceptCallNodes3 = acceptCallNodes(this, sexpr),
                path = _acceptCallNodes3.path,
                params = _acceptCallNodes3.params,
                hash = _acceptCallNodes3.hash;

            return b.sexpr(path, params, hash, sexpr.loc);
        };

        HandlebarsNodeVisitors.prototype.PathExpression = function (path) {
            var original = path.original,
                loc = path.loc;

            var parts = void 0;
            if (original.indexOf('/') !== -1) {
                if (original.slice(0, 2) === './') {
                    throw new SyntaxError('Using "./" is not supported in Glimmer and unnecessary: "' + path.original + '" on line ' + loc.start.line + '.', path.loc);
                }
                if (original.slice(0, 3) === '../') {
                    throw new SyntaxError('Changing context using "../" is not supported in Glimmer: "' + path.original + '" on line ' + loc.start.line + '.', path.loc);
                }
                if (original.indexOf('.') !== -1) {
                    throw new SyntaxError('Mixing \'.\' and \'/\' in paths is not supported in Glimmer; use only \'.\' to separate property paths: "' + path.original + '" on line ' + loc.start.line + '.', path.loc);
                }
                parts = [path.parts.join('/')];
            } else {
                parts = path.parts;
            }
            var thisHead = false;
            // This is to fix a bug in the Handlebars AST where the path expressions in
            // `{{this.foo}}` (and similarly `{{foo-bar this.foo named=this.foo}}` etc)
            // are simply turned into `{{foo}}`. The fix is to push it back onto the
            // parts array and let the runtime see the difference. However, we cannot
            // simply use the string `this` as it means literally the property called
            // "this" in the current context (it can be expressed in the syntax as
            // `{{[this]}}`, where the square bracket are generally for this kind of
            // escaping – such as `{{foo.["bar.baz"]}}` would mean lookup a property
            // named literally "bar.baz" on `this.foo`). By convention, we use `null`
            // for this purpose.
            if (original.match(/^this(\..+)?$/)) {
                thisHead = true;
            }
            return {
                type: 'PathExpression',
                original: path.original,
                this: thisHead,
                parts: parts,
                data: path.data,
                loc: path.loc
            };
        };

        HandlebarsNodeVisitors.prototype.Hash = function (hash) {
            var pairs = [],
                i,
                pair;
            for (i = 0; i < hash.pairs.length; i++) {
                pair = hash.pairs[i];

                pairs.push(b.pair(pair.key, this.acceptNode(pair.value), pair.loc));
            }
            return b.hash(pairs, hash.loc);
        };

        HandlebarsNodeVisitors.prototype.StringLiteral = function (string) {
            return b.literal('StringLiteral', string.value, string.loc);
        };

        HandlebarsNodeVisitors.prototype.BooleanLiteral = function (boolean) {
            return b.literal('BooleanLiteral', boolean.value, boolean.loc);
        };

        HandlebarsNodeVisitors.prototype.NumberLiteral = function (number) {
            return b.literal('NumberLiteral', number.value, number.loc);
        };

        HandlebarsNodeVisitors.prototype.UndefinedLiteral = function (undef) {
            return b.literal('UndefinedLiteral', undefined, undef.loc);
        };

        HandlebarsNodeVisitors.prototype.NullLiteral = function (nul) {
            return b.literal('NullLiteral', null, nul.loc);
        };

        return HandlebarsNodeVisitors;
    }(Parser);

    function calculateRightStrippedOffsets(original, value) {
        if (value === '') {
            // if it is empty, just return the count of newlines
            // in original
            return {
                lines: original.split('\n').length - 1,
                columns: 0
            };
        }
        // otherwise, return the number of newlines prior to
        // `value`
        var difference = original.split(value)[0];
        var lines = difference.split(/\n/);
        var lineCount = lines.length - 1;
        return {
            lines: lineCount,
            columns: lines[lineCount].length
        };
    }
    function updateTokenizerLocation(tokenizer, content) {
        var line = content.loc.start.line;
        var column = content.loc.start.column;
        var offsets = calculateRightStrippedOffsets(content.original, content.value);
        line = line + offsets.lines;
        if (offsets.lines) {
            column = offsets.columns;
        } else {
            column = column + offsets.columns;
        }
        tokenizer.line = line;
        tokenizer.column = column;
    }
    function acceptCallNodes(compiler, node) {
        var path = compiler.PathExpression(node.path);
        var params = node.params ? node.params.map(function (e) {
            return compiler.acceptNode(e);
        }) : [];
        var hash = node.hash ? compiler.Hash(node.hash) : b.hash();
        return { path: path, params: params, hash: hash };
    }
    function addElementModifier(element, mustache) {
        var path = mustache.path,
            params = mustache.params,
            hash = mustache.hash,
            loc = mustache.loc,
            _modifier,
            tag;

        if (isLiteral$1(path)) {
            _modifier = '{{' + printLiteral(path) + '}}';
            tag = '<' + element.name + ' ... ' + _modifier + ' ...';

            throw new SyntaxError('In ' + tag + ', ' + _modifier + ' is not a valid modifier: "' + path.original + '" on line ' + (loc && loc.start.line) + '.', mustache.loc);
        }
        var modifier = b.elementModifier(path, params, hash, loc);
        element.modifiers.push(modifier);
    }
    function addInElementHash(cursor, hash, loc) {
        var hasNextSibling = false,
            nullLiteral,
            nextSibling;
        hash.pairs.forEach(function (pair) {
            if (pair.key === 'guid') {
                throw new SyntaxError('Cannot pass `guid` from user space', loc);
            }
            if (pair.key === 'nextSibling') {
                hasNextSibling = true;
            }
        });
        var guid = b.literal('StringLiteral', cursor);
        var guidPair = b.pair('guid', guid);
        hash.pairs.unshift(guidPair);
        if (!hasNextSibling) {
            nullLiteral = b.literal('NullLiteral', null);
            nextSibling = b.pair('nextSibling', nullLiteral);

            hash.pairs.push(nextSibling);
        }
        return hash;
    }
    function appendDynamicAttributeValuePart(attribute, part) {
        attribute.isDynamic = true;
        attribute.parts.push(part);
    }

    var visitorKeys = {
        Program: ['body'],
        MustacheStatement: ['path', 'params', 'hash'],
        BlockStatement: ['path', 'params', 'hash', 'program', 'inverse'],
        ElementModifierStatement: ['path', 'params', 'hash'],
        PartialStatement: ['name', 'params', 'hash'],
        CommentStatement: [],
        MustacheCommentStatement: [],
        ElementNode: ['attributes', 'modifiers', 'children', 'comments'],
        AttrNode: ['value'],
        TextNode: [],
        ConcatStatement: ['parts'],
        SubExpression: ['path', 'params', 'hash'],
        PathExpression: [],
        StringLiteral: [],
        BooleanLiteral: [],
        NumberLiteral: [],
        NullLiteral: [],
        UndefinedLiteral: [],
        Hash: ['pairs'],
        HashPair: ['value']
    };

    var TraversalError = function () {
        TraversalError.prototype = Object.create(Error.prototype);
        TraversalError.prototype.constructor = TraversalError;
        function TraversalError(message, node, parent, key) {
            var error = Error.call(this, message);
            this.key = key;
            this.message = message;
            this.node = node;
            this.parent = parent;
            this.stack = error.stack;
        }
        return TraversalError;
    }();
    function cannotRemoveNode(node, parent, key) {
        return new TraversalError('Cannot remove a node unless it is part of an array', node, parent, key);
    }
    function cannotReplaceNode(node, parent, key) {
        return new TraversalError('Cannot replace a node with multiple nodes unless it is part of an array', node, parent, key);
    }
    function cannotReplaceOrRemoveInKeyHandlerYet(node, key) {
        return new TraversalError('Replacing and removing in key handlers is not yet supported.', node, null, key);
    }

    function visitNode(visitor, node) {
        var handler = visitor[node.type] || visitor.All || null,
            keys,
            i;
        var result = void 0;
        if (handler && handler['enter']) {
            result = handler['enter'].call(null, node);
        }
        if (result !== undefined && result !== null) {
            if (JSON.stringify(node) === JSON.stringify(result)) {
                result = undefined;
            } else if (Array.isArray(result)) {
                return visitArray(visitor, result) || result;
            } else {
                return visitNode(visitor, result) || result;
            }
        }
        if (result === undefined) {
            keys = visitorKeys[node.type];

            for (i = 0; i < keys.length; i++) {
                visitKey(visitor, handler, node, keys[i]);
            }
            if (handler && handler['exit']) {
                result = handler['exit'].call(null, node);
            }
        }
        return result;
    }
    function visitKey(visitor, handler, node, key) {
        var value = node[key],
            _result;
        if (!value) {
            return;
        }
        var keyHandler = handler && (handler.keys[key] || handler.keys.All);
        var result = void 0;
        if (keyHandler && keyHandler.enter) {
            result = keyHandler.enter.call(null, node, key);
            if (result !== undefined) {
                throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
            }
        }
        if (Array.isArray(value)) {
            visitArray(visitor, value);
        } else {
            _result = visitNode(visitor, value);

            if (_result !== undefined) {
                assignKey(node, key, _result);
            }
        }
        if (keyHandler && keyHandler.exit) {
            result = keyHandler.exit.call(null, node, key);
            if (result !== undefined) {
                throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
            }
        }
    }
    function visitArray(visitor, array) {
        var i, result;

        for (i = 0; i < array.length; i++) {
            result = visitNode(visitor, array[i]);

            if (result !== undefined) {
                i += spliceArray(array, i, result) - 1;
            }
        }
    }
    function assignKey(node, key, result) {
        if (result === null) {
            throw cannotRemoveNode(node[key], node, key);
        } else if (Array.isArray(result)) {
            if (result.length === 1) {
                node[key] = result[0];
            } else {
                if (result.length === 0) {
                    throw cannotRemoveNode(node[key], node, key);
                } else {
                    throw cannotReplaceNode(node[key], node, key);
                }
            }
        } else {
            node[key] = result;
        }
    }
    function spliceArray(array, index, result) {
        if (result === null) {
            array.splice(index, 1);
            return 0;
        } else if (Array.isArray(result)) {
            array.splice.apply(array, [index, 1].concat(result));
            return result.length;
        } else {
            array.splice(index, 1, result);
            return 1;
        }
    }
    function traverse(node, visitor) {
        visitNode(normalizeVisitor(visitor), node);
    }
    function normalizeVisitor(visitor) {
        var normalizedVisitor = {},
            handler,
            normalizedKeys,
            keys,
            keyHandler;
        for (var type in visitor) {
            handler = visitor[type] || visitor.All;
            normalizedKeys = {};

            if (typeof handler === 'object') {
                keys = handler.keys;

                if (keys) {
                    for (var key in keys) {
                        keyHandler = keys[key];

                        if (typeof keyHandler === 'object') {
                            normalizedKeys[key] = {
                                enter: typeof keyHandler.enter === 'function' ? keyHandler.enter : null,
                                exit: typeof keyHandler.exit === 'function' ? keyHandler.exit : null
                            };
                        } else if (typeof keyHandler === 'function') {
                            normalizedKeys[key] = {
                                enter: keyHandler,
                                exit: null
                            };
                        }
                    }
                }
                normalizedVisitor[type] = {
                    enter: typeof handler.enter === 'function' ? handler.enter : null,
                    exit: typeof handler.exit === 'function' ? handler.exit : null,
                    keys: normalizedKeys
                };
            } else if (typeof handler === 'function') {
                normalizedVisitor[type] = {
                    enter: handler,
                    exit: null,
                    keys: normalizedKeys
                };
            }
        }
        return normalizedVisitor;
    }

    function unreachable() {
        throw new Error('unreachable');
    }
    function build(ast) {
        if (!ast) {
            return '';
        }
        var output = [],
            chainBlock,
            body,
            value,
            lines;
        switch (ast.type) {
            case 'Program':
                {
                    chainBlock = ast['chained'] && ast.body[0];

                    if (chainBlock) {
                        chainBlock['chained'] = true;
                    }
                    body = buildEach(ast.body).join('');

                    output.push(body);
                }
                break;
            case 'ElementNode':
                output.push('<', ast.tag);
                if (ast.attributes.length) {
                    output.push(' ', buildEach(ast.attributes).join(' '));
                }
                if (ast.modifiers.length) {
                    output.push(' ', buildEach(ast.modifiers).join(' '));
                }
                if (ast.comments.length) {
                    output.push(' ', buildEach(ast.comments).join(' '));
                }
                if (voidMap[ast.tag]) {
                    if (ast.selfClosing) {
                        output.push(' /');
                    }
                    output.push('>');
                } else {
                    output.push('>');
                    output.push.apply(output, buildEach(ast.children));
                    output.push('</', ast.tag, '>');
                }
                break;
            case 'AttrNode':
                output.push(ast.name, '=');
                value = build(ast.value);

                if (ast.value.type === 'TextNode') {
                    output.push('"', value, '"');
                } else {
                    output.push(value);
                }
                break;
            case 'ConcatStatement':
                output.push('"');
                ast.parts.forEach(function (node) {
                    if (node.type === 'StringLiteral') {
                        output.push(node.original);
                    } else {
                        output.push(build(node));
                    }
                });
                output.push('"');
                break;
            case 'TextNode':
                output.push(ast.chars);
                break;
            case 'MustacheStatement':
                {
                    output.push(compactJoin(['{{', pathParams(ast), '}}']));
                }
                break;
            case 'MustacheCommentStatement':
                {
                    output.push(compactJoin(['{{!--', ast.value, '--}}']));
                }
                break;
            case 'ElementModifierStatement':
                {
                    output.push(compactJoin(['{{', pathParams(ast), '}}']));
                }
                break;
            case 'PathExpression':
                output.push(ast.original);
                break;
            case 'SubExpression':
                {
                    output.push('(', pathParams(ast), ')');
                }
                break;
            case 'BooleanLiteral':
                output.push(ast.value ? 'true' : 'false');
                break;
            case 'BlockStatement':
                {
                    lines = [];

                    if (ast['chained']) {
                        lines.push(['{{else ', pathParams(ast), '}}'].join(''));
                    } else {
                        lines.push(openBlock(ast));
                    }
                    lines.push(build(ast.program));
                    if (ast.inverse) {
                        if (!ast.inverse['chained']) {
                            lines.push('{{else}}');
                        }
                        lines.push(build(ast.inverse));
                    }
                    if (!ast['chained']) {
                        lines.push(closeBlock(ast));
                    }
                    output.push(lines.join(''));
                }
                break;
            case 'PartialStatement':
                {
                    output.push(compactJoin(['{{>', pathParams(ast), '}}']));
                }
                break;
            case 'CommentStatement':
                {
                    output.push(compactJoin(['<!--', ast.value, '-->']));
                }
                break;
            case 'StringLiteral':
                {
                    output.push('"' + ast.value + '"');
                }
                break;
            case 'NumberLiteral':
                {
                    output.push(String(ast.value));
                }
                break;
            case 'UndefinedLiteral':
                {
                    output.push('undefined');
                }
                break;
            case 'NullLiteral':
                {
                    output.push('null');
                }
                break;
            case 'Hash':
                {
                    output.push(ast.pairs.map(function (pair) {
                        return build(pair);
                    }).join(' '));
                }
                break;
            case 'HashPair':
                {
                    output.push(ast.key + '=' + build(ast.value));
                }
                break;
        }
        return output.join('');
    }
    function compact(array) {
        var newArray = [];
        array.forEach(function (a) {
            if (typeof a !== 'undefined' && a !== null && a !== '') {
                newArray.push(a);
            }
        });
        return newArray;
    }
    function buildEach(asts) {
        return asts.map(build);
    }
    function pathParams(ast) {
        var path = void 0;
        switch (ast.type) {
            case 'MustacheStatement':
            case 'SubExpression':
            case 'ElementModifierStatement':
            case 'BlockStatement':
                if (isLiteral(ast.path)) {
                    return String(ast.path.value);
                }
                path = build(ast.path);
                break;
            case 'PartialStatement':
                path = build(ast.name);
                break;
            default:
                return unreachable();
        }
        return compactJoin([path, buildEach(ast.params).join(' '), build(ast.hash)], ' ');
    }
    function compactJoin(array, delimiter) {
        return compact(array).join(delimiter || '');
    }
    function blockParams(block) {
        var params = block.program.blockParams;
        if (params.length) {
            return ' as |' + params.join(' ') + '|';
        }
        return null;
    }
    function openBlock(block) {
        return ['{{#', pathParams(block), blockParams(block), '}}'].join('');
    }
    function closeBlock(block) {
        return ['{{/', build(block.path), '}}'].join('');
    }

    var Walker = function () {
        function Walker(order) {

            this.order = order;
            this.stack = [];
        }

        Walker.prototype.visit = function (node, callback) {
            if (!node) {
                return;
            }
            this.stack.push(node);
            if (this.order === 'post') {
                this.children(node, callback);
                callback(node, this);
            } else {
                callback(node, this);
                this.children(node, callback);
            }
            this.stack.pop();
        };

        Walker.prototype.children = function (node, callback) {
            var visitor = visitors[node.type];
            if (visitor) {
                visitor(this, node, callback);
            }
        };

        return Walker;
    }();

    var visitors = {
        Program: function (walker, node, callback) {
            var i;

            for (i = 0; i < node.body.length; i++) {
                walker.visit(node.body[i], callback);
            }
        },
        ElementNode: function (walker, node, callback) {
            var i;

            for (i = 0; i < node.children.length; i++) {
                walker.visit(node.children[i], callback);
            }
        },
        BlockStatement: function (walker, node, callback) {
            walker.visit(node.program, callback);
            walker.visit(node.inverse || null, callback);
        }
    };

    var voidMap = Object.create(null);

    'area base br col command embed hr img input keygen link meta param source track wbr'.split(' ').forEach(function (tagName) {
        voidMap[tagName] = true;
    });

    var TokenizerEventHandlers = function (_HandlebarsNodeVisito) {
        (0, _emberBabel.inherits)(TokenizerEventHandlers, _HandlebarsNodeVisito);

        function TokenizerEventHandlers() {

            var _this2 = (0, _emberBabel.possibleConstructorReturn)(this, _HandlebarsNodeVisito.apply(this, arguments));

            _this2.tagOpenLine = 0;
            _this2.tagOpenColumn = 0;
            return _this2;
        }

        TokenizerEventHandlers.prototype.reset = function () {
            this.currentNode = null;
        };

        TokenizerEventHandlers.prototype.beginComment = function () {
            this.currentNode = b.comment('');
            this.currentNode.loc = {
                source: null,
                start: b.pos(this.tagOpenLine, this.tagOpenColumn),
                end: null
            };
        };

        TokenizerEventHandlers.prototype.appendToCommentData = function (char) {
            this.currentComment.value += char;
        };

        TokenizerEventHandlers.prototype.finishComment = function () {
            this.currentComment.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);
            appendChild(this.currentElement(), this.currentComment);
        };

        TokenizerEventHandlers.prototype.beginData = function () {
            this.currentNode = b.text();
            this.currentNode.loc = {
                source: null,
                start: b.pos(this.tokenizer.line, this.tokenizer.column),
                end: null
            };
        };

        TokenizerEventHandlers.prototype.appendToData = function (char) {
            this.currentData.chars += char;
        };

        TokenizerEventHandlers.prototype.finishData = function () {
            this.currentData.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);
            appendChild(this.currentElement(), this.currentData);
        };

        TokenizerEventHandlers.prototype.tagOpen = function () {
            this.tagOpenLine = this.tokenizer.line;
            this.tagOpenColumn = this.tokenizer.column;
        };

        TokenizerEventHandlers.prototype.beginStartTag = function () {
            this.currentNode = {
                type: 'StartTag',
                name: '',
                attributes: [],
                modifiers: [],
                comments: [],
                selfClosing: false,
                loc: SYNTHETIC
            };
        };

        TokenizerEventHandlers.prototype.beginEndTag = function () {
            this.currentNode = {
                type: 'EndTag',
                name: '',
                attributes: [],
                modifiers: [],
                comments: [],
                selfClosing: false,
                loc: SYNTHETIC
            };
        };

        TokenizerEventHandlers.prototype.finishTag = function () {
            var _tokenizer = this.tokenizer,
                line = _tokenizer.line,
                column = _tokenizer.column;

            var tag = this.currentTag;
            tag.loc = b.loc(this.tagOpenLine, this.tagOpenColumn, line, column);
            if (tag.type === 'StartTag') {
                this.finishStartTag();
                if (voidMap[tag.name] || tag.selfClosing) {
                    this.finishEndTag(true);
                }
            } else if (tag.type === 'EndTag') {
                this.finishEndTag(false);
            }
        };

        TokenizerEventHandlers.prototype.finishStartTag = function () {
            var _currentStartTag = this.currentStartTag,
                name = _currentStartTag.name,
                attributes = _currentStartTag.attributes,
                modifiers = _currentStartTag.modifiers,
                comments = _currentStartTag.comments,
                selfClosing = _currentStartTag.selfClosing;

            var loc = b.loc(this.tagOpenLine, this.tagOpenColumn);
            var element = b.element({ name: name, selfClosing: selfClosing }, attributes, modifiers, [], comments, loc);
            this.elementStack.push(element);
        };

        TokenizerEventHandlers.prototype.finishEndTag = function (isVoid) {
            var tag = this.currentTag;
            var element = this.elementStack.pop();
            var parent = this.currentElement();
            validateEndTag(tag, element, isVoid);
            element.loc.end.line = this.tokenizer.line;
            element.loc.end.column = this.tokenizer.column;
            parseElementBlockParams(element);
            appendChild(parent, element);
        };

        TokenizerEventHandlers.prototype.markTagAsSelfClosing = function () {
            this.currentTag.selfClosing = true;
        };

        TokenizerEventHandlers.prototype.appendToTagName = function (char) {
            this.currentTag.name += char;
        };

        TokenizerEventHandlers.prototype.beginAttribute = function () {
            var tag = this.currentTag;
            if (tag.type === 'EndTag') {
                throw new SyntaxError('Invalid end tag: closing tag must not have attributes, ' + ('in `' + tag.name + '` (on line ' + this.tokenizer.line + ').'), tag.loc);
            }
            this.currentAttribute = {
                name: '',
                parts: [],
                isQuoted: false,
                isDynamic: false,
                start: b.pos(this.tokenizer.line, this.tokenizer.column),
                valueStartLine: 0,
                valueStartColumn: 0
            };
        };

        TokenizerEventHandlers.prototype.appendToAttributeName = function (char) {
            this.currentAttr.name += char;
        };

        TokenizerEventHandlers.prototype.beginAttributeValue = function (isQuoted) {
            this.currentAttr.isQuoted = isQuoted;
            this.currentAttr.valueStartLine = this.tokenizer.line;
            this.currentAttr.valueStartColumn = this.tokenizer.column;
        };

        TokenizerEventHandlers.prototype.appendToAttributeValue = function (char) {
            var parts = this.currentAttr.parts,
                loc,
                text;
            var lastPart = parts[parts.length - 1];
            if (lastPart && lastPart.type === 'TextNode') {
                lastPart.chars += char;
                // update end location for each added char
                lastPart.loc.end.line = this.tokenizer.line;
                lastPart.loc.end.column = this.tokenizer.column;
            } else {
                // initially assume the text node is a single char
                loc = b.loc(this.tokenizer.line, this.tokenizer.column, this.tokenizer.line, this.tokenizer.column);
                // correct for `\n` as first char

                if (char === '\n') {
                    loc.start.line -= 1;
                    loc.start.column = lastPart ? lastPart.loc.end.column : this.currentAttr.valueStartColumn;
                }
                text = b.text(char, loc);

                parts.push(text);
            }
        };

        TokenizerEventHandlers.prototype.finishAttributeValue = function () {
            var _currentAttr = this.currentAttr,
                name = _currentAttr.name,
                parts = _currentAttr.parts,
                isQuoted = _currentAttr.isQuoted,
                isDynamic = _currentAttr.isDynamic,
                valueStartLine = _currentAttr.valueStartLine,
                valueStartColumn = _currentAttr.valueStartColumn;

            var value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);
            value.loc = b.loc(valueStartLine, valueStartColumn, this.tokenizer.line, this.tokenizer.column);
            var loc = b.loc(this.currentAttr.start.line, this.currentAttr.start.column, this.tokenizer.line, this.tokenizer.column);
            var attribute = b.attr(name, value, loc);
            this.currentStartTag.attributes.push(attribute);
        };

        TokenizerEventHandlers.prototype.reportSyntaxError = function (message) {
            throw new SyntaxError('Syntax error at line ' + this.tokenizer.line + ' col ' + this.tokenizer.column + ': ' + message, b.loc(this.tokenizer.line, this.tokenizer.column));
        };

        return TokenizerEventHandlers;
    }(HandlebarsNodeVisitors);

    function assembleAttributeValue(parts, isQuoted, isDynamic, line) {
        if (isDynamic) {
            if (isQuoted) {
                return assembleConcatenatedValue(parts);
            } else {
                if (parts.length === 1 || parts.length === 2 && parts[1].type === 'TextNode' && parts[1].chars === '/') {
                    return parts[0];
                } else {
                    throw new SyntaxError('An unquoted attribute value must be a string or a mustache, ' + 'preceeded by whitespace or a \'=\' character, and ' + ('followed by whitespace, a \'>\' character, or \'/>\' (on line ' + line + ')'), b.loc(line, 0));
                }
            }
        } else {
            return parts.length > 0 ? parts[0] : b.text('');
        }
    }
    function assembleConcatenatedValue(parts) {
        var i, part;

        for (i = 0; i < parts.length; i++) {
            part = parts[i];

            if (part.type !== 'MustacheStatement' && part.type !== 'TextNode') {
                throw new SyntaxError('Unsupported node in quoted attribute value: ' + part['type'], part.loc);
            }
        }
        return b.concat(parts);
    }
    function validateEndTag(tag, element, selfClosing) {
        var error = void 0;
        if (voidMap[tag.name] && !selfClosing) {
            // EngTag is also called by StartTag for void and self-closing tags (i.e.
            // <input> or <br />, so we need to check for that here. Otherwise, we would
            // throw an error for those cases.
            error = 'Invalid end tag ' + formatEndTagInfo(tag) + ' (void elements cannot have end tags).';
        } else if (element.tag === undefined) {
            error = 'Closing tag ' + formatEndTagInfo(tag) + ' without an open tag.';
        } else if (element.tag !== tag.name) {
            error = 'Closing tag ' + formatEndTagInfo(tag) + ' did not match last open tag `' + element.tag + '` (on line ' + element.loc.start.line + ').';
        }
        if (error) {
            throw new SyntaxError(error, element.loc);
        }
    }
    function formatEndTagInfo(tag) {
        return '`' + tag.name + '` (on line ' + tag.loc.end.line + ')';
    }
    var syntax = {
        parse: preprocess,
        builders: b,
        print: build,
        traverse: traverse,
        Walker: Walker
    };
    function preprocess(html, options) {
        var ast = typeof html === 'object' ? html : (0, _handlebars.parse)(html),
            i,
            l,
            transform,
            env,
            pluginResult;
        var program = new TokenizerEventHandlers(html).acceptNode(ast);
        if (options && options.plugins && options.plugins.ast) {
            for (i = 0, l = options.plugins.ast.length; i < l; i++) {
                transform = options.plugins.ast[i];
                env = (0, _util.assign)({}, options, { syntax: syntax }, { plugins: undefined });
                pluginResult = transform(env);

                traverse(program, pluginResult.visitor);
            }
        }
        return program;
    }

    // used by ember-compiler

    exports.AST = nodes;
    exports.preprocess = preprocess;
    exports.builders = b;
    exports.TraversalError = TraversalError;
    exports.cannotRemoveNode = cannotRemoveNode;
    exports.cannotReplaceNode = cannotReplaceNode;
    exports.cannotReplaceOrRemoveInKeyHandlerYet = cannotReplaceOrRemoveInKeyHandlerYet;
    exports.traverse = traverse;
    exports.Walker = Walker;
    exports.print = build;
    exports.SyntaxError = SyntaxError;
    exports.isLiteral = isLiteral$1;
    exports.printLiteral = printLiteral;
});
enifed('@glimmer/util', ['exports', 'ember-babel'], function (exports, _emberBabel) {
    'use strict';

    exports.unreachable = exports.expect = exports.unwrap = exports.EMPTY_ARRAY = exports.ListSlice = exports.ListNode = exports.LinkedList = exports.EMPTY_SLICE = exports.dict = exports.DictSet = exports.Stack = exports.SERIALIZATION_FIRST_NODE_STRING = exports.isSerializationFirstNode = exports.initializeGuid = exports.ensureGuid = exports.fillNulls = exports.assign = exports.assert = undefined;

    // import Logger from './logger';
    // let alreadyWarned = false;


    var objKeys = Object.keys;

    var GUID = 0;
    function initializeGuid(object) {
        return object._guid = ++GUID;
    }
    function ensureGuid(object) {
        return object._guid || initializeGuid(object);
    }

    var SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';


    function dict() {
        return Object.create(null);
    }

    var DictSet = function () {
        function DictSet() {

            this.dict = dict();
        }

        DictSet.prototype.add = function (obj) {
            if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[ensureGuid(obj)] = obj;
            return this;
        };

        DictSet.prototype.delete = function (obj) {
            if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
        };

        return DictSet;
    }();

    var Stack = function () {
        function Stack() {

            this.stack = [];
            this.current = null;
        }

        Stack.prototype.push = function (item) {
            this.current = item;
            this.stack.push(item);
        };

        Stack.prototype.pop = function () {
            var item = this.stack.pop();
            var len = this.stack.length;
            this.current = len === 0 ? null : this.stack[len - 1];
            return item === undefined ? null : item;
        };

        Stack.prototype.isEmpty = function () {
            return this.stack.length === 0;
        };

        (0, _emberBabel.createClass)(Stack, [{
            key: 'size',
            get: function () {
                return this.stack.length;
            }
        }]);
        return Stack;
    }();

    var LinkedList = function () {
        function LinkedList() {

            this.clear();
        }

        LinkedList.prototype.head = function () {
            return this._head;
        };

        LinkedList.prototype.tail = function () {
            return this._tail;
        };

        LinkedList.prototype.clear = function () {
            this._head = this._tail = null;
        };

        LinkedList.prototype.toArray = function () {
            var out = [];
            this.forEachNode(function (n) {
                return out.push(n);
            });
            return out;
        };

        LinkedList.prototype.nextNode = function (node) {
            return node.next;
        };

        LinkedList.prototype.forEachNode = function (callback) {
            var node = this._head;
            while (node !== null) {
                callback(node);
                node = node.next;
            }
        };

        LinkedList.prototype.insertBefore = function (node) {
            var reference = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            if (reference === null) return this.append(node);
            if (reference.prev) reference.prev.next = node;else this._head = node;
            node.prev = reference.prev;
            node.next = reference;
            reference.prev = node;
            return node;
        };

        LinkedList.prototype.append = function (node) {
            var tail = this._tail;
            if (tail) {
                tail.next = node;
                node.prev = tail;
                node.next = null;
            } else {
                this._head = node;
            }
            return this._tail = node;
        };

        LinkedList.prototype.remove = function (node) {
            if (node.prev) node.prev.next = node.next;else this._head = node.next;
            if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
            return node;
        };

        return LinkedList;
    }();

    var ListSlice = function () {
        function ListSlice(head, tail) {

            this._head = head;
            this._tail = tail;
        }

        ListSlice.prototype.forEachNode = function (callback) {
            var node = this._head;
            while (node !== null) {
                callback(node);
                node = this.nextNode(node);
            }
        };

        ListSlice.prototype.head = function () {
            return this._head;
        };

        ListSlice.prototype.tail = function () {
            return this._tail;
        };

        ListSlice.prototype.toArray = function () {
            var out = [];
            this.forEachNode(function (n) {
                return out.push(n);
            });
            return out;
        };

        ListSlice.prototype.nextNode = function (node) {
            if (node === this._tail) return null;
            return node.next;
        };

        return ListSlice;
    }();

    var EMPTY_SLICE = new ListSlice(null, null);

    var EMPTY_ARRAY = Object.freeze([]);

    exports.assert = function (test, msg) {
        // if (!alreadyWarned) {
        //   alreadyWarned = true;
        //   Logger.warn("Don't leave debug assertions on in public builds");
        // }
        if (!test) {
            throw new Error(msg || 'assertion failure');
        }
    };
    exports.assign = function (obj) {
        var i, assignment, keys, j, key;

        for (i = 1; i < arguments.length; i++) {
            assignment = arguments[i];

            if (assignment === null || typeof assignment !== 'object') continue;
            keys = objKeys(assignment);

            for (j = 0; j < keys.length; j++) {
                key = keys[j];

                obj[key] = assignment[key];
            }
        }
        return obj;
    };
    exports.fillNulls = function (count) {
        var arr = new Array(count),
            i;
        for (i = 0; i < count; i++) {
            arr[i] = null;
        }
        return arr;
    };
    exports.ensureGuid = ensureGuid;
    exports.initializeGuid = initializeGuid;
    exports.isSerializationFirstNode = function (node) {
        return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
    };
    exports.SERIALIZATION_FIRST_NODE_STRING = SERIALIZATION_FIRST_NODE_STRING;
    exports.Stack = Stack;
    exports.DictSet = DictSet;
    exports.dict = dict;
    exports.EMPTY_SLICE = EMPTY_SLICE;
    exports.LinkedList = LinkedList;
    exports.ListNode = function (value) {

        this.next = null;
        this.prev = null;
        this.value = value;
    };
    exports.ListSlice = ListSlice;
    exports.EMPTY_ARRAY = EMPTY_ARRAY;
    exports.unwrap = function (val) {
        if (val === null || val === undefined) throw new Error('Expected value to be present');
        return val;
    };
    exports.expect = function (val, message) {
        if (val === null || val === undefined) throw new Error(message);
        return val;
    };
    exports.unreachable = function () {
        var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unreachable';

        return new Error(message);
    };
});
enifed("@glimmer/wire-format", ["exports"], function (exports) {
    "use strict";

    var Opcodes;
    (function (Opcodes) {
        // Statements
        Opcodes[Opcodes["Text"] = 0] = "Text";
        Opcodes[Opcodes["Append"] = 1] = "Append";
        Opcodes[Opcodes["Comment"] = 2] = "Comment";
        Opcodes[Opcodes["Modifier"] = 3] = "Modifier";
        Opcodes[Opcodes["Block"] = 4] = "Block";
        Opcodes[Opcodes["Component"] = 5] = "Component";
        Opcodes[Opcodes["OpenElement"] = 6] = "OpenElement";
        Opcodes[Opcodes["OpenSplattedElement"] = 7] = "OpenSplattedElement";
        Opcodes[Opcodes["FlushElement"] = 8] = "FlushElement";
        Opcodes[Opcodes["CloseElement"] = 9] = "CloseElement";
        Opcodes[Opcodes["StaticAttr"] = 10] = "StaticAttr";
        Opcodes[Opcodes["DynamicAttr"] = 11] = "DynamicAttr";
        Opcodes[Opcodes["AttrSplat"] = 12] = "AttrSplat";
        Opcodes[Opcodes["Yield"] = 13] = "Yield";
        Opcodes[Opcodes["Partial"] = 14] = "Partial";
        Opcodes[Opcodes["DynamicArg"] = 15] = "DynamicArg";
        Opcodes[Opcodes["StaticArg"] = 16] = "StaticArg";
        Opcodes[Opcodes["TrustingAttr"] = 17] = "TrustingAttr";
        Opcodes[Opcodes["Debugger"] = 18] = "Debugger";
        Opcodes[Opcodes["ClientSideStatement"] = 19] = "ClientSideStatement";
        // Expressions
        Opcodes[Opcodes["Unknown"] = 20] = "Unknown";
        Opcodes[Opcodes["Get"] = 21] = "Get";
        Opcodes[Opcodes["MaybeLocal"] = 22] = "MaybeLocal";
        Opcodes[Opcodes["HasBlock"] = 23] = "HasBlock";
        Opcodes[Opcodes["HasBlockParams"] = 24] = "HasBlockParams";
        Opcodes[Opcodes["Undefined"] = 25] = "Undefined";
        Opcodes[Opcodes["Helper"] = 26] = "Helper";
        Opcodes[Opcodes["Concat"] = 27] = "Concat";
        Opcodes[Opcodes["ClientSideExpression"] = 28] = "ClientSideExpression";
    })(Opcodes || (exports.Ops = Opcodes = {}));

    function is(variant) {
        return function (value) {
            return Array.isArray(value) && value[0] === variant;
        };
    }
    // Statements
    var isModifier = is(Opcodes.Modifier);
    var isFlushElement = is(Opcodes.FlushElement);
    function isAttribute(val) {
        return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.TrustingAttr;
    }
    function isArgument(val) {
        return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
    }
    // Expressions
    var isGet = is(Opcodes.Get);
    var isMaybeLocal = is(Opcodes.MaybeLocal);

    exports.is = is;
    exports.isModifier = isModifier;
    exports.isFlushElement = isFlushElement;
    exports.isAttribute = isAttribute;
    exports.isArgument = isArgument;
    exports.isGet = isGet;
    exports.isMaybeLocal = isMaybeLocal;
    exports.Ops = Opcodes;
});
enifed('container', ['exports', 'ember-debug', 'ember/features', 'ember-utils', 'ember-environment'], function (exports, _emberDebug, _features, _emberUtils, _emberEnvironment) {
  'use strict';

  exports.FACTORY_FOR = exports.Container = exports.privatize = exports.Registry = undefined;

  /* globals Proxy */

  var leakTracking = void 0,
      containers = void 0;

  // requires v8
  // chrome --js-flags="--allow-natives-syntax --expose-gc"
  // node --allow-natives-syntax --expose-gc
  try {
    /* globals gc, WeakSet */
    if (typeof gc === 'function') {
      leakTracking = function () {
        // avoid syntax errors when --allow-natives-syntax not present
        var GetWeakSetValues = new Function('weakSet', 'return %GetWeakSetValues(weakSet, 0)');
        containers = new WeakSet();
        return {
          hasContainers: function () {
            gc();
            return GetWeakSetValues(containers).length > 0;
          },
          reset: function () {
            var values = GetWeakSetValues(containers),
                i;
            for (i = 0; i < values.length; i++) {
              containers.delete(values[i]);
            }
          }
        };
      }();
    }
  } catch (e) {
    // ignore
  }

  /**
   A container used to instantiate and cache objects.
  
   Every `Container` must be associated with a `Registry`, which is referenced
   to determine the factory and options that should be used to instantiate
   objects.
  
   The public API for `Container` is still in flux and should not be considered
   stable.
  
   @private
   @class Container
   */

  var Container = function () {
    function Container(registry) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


      this.registry = registry;
      this.owner = options.owner || null;
      this.cache = (0, _emberUtils.dictionary)(options.cache || null);
      this.factoryManagerCache = (0, _emberUtils.dictionary)(options.factoryManagerCache || null);
      this.isDestroyed = false;
      this.isDestroying = false;

      this.validationCache = (0, _emberUtils.dictionary)(options.validationCache || null);
      if (containers !== undefined) {
        containers.add(this);
      }
    }

    /**
     @private
     @property registry
     @type Registry
     @since 1.11.0
     */

    /**
     @private
     @property cache
     @type InheritingDict
     */

    /**
     @private
     @property validationCache
     @type InheritingDict
     */

    /**
     Given a fullName return a corresponding instance.
      The default behavior is for lookup to return a singleton instance.
     The singleton is scoped to the container, allowing multiple containers
     to all have their own locally scoped singletons.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter');
      twitter instanceof Twitter; // => true
      // by default the container will return singletons
     let twitter2 = container.lookup('api:twitter');
     twitter2 instanceof Twitter; // => true
      twitter === twitter2; //=> true
     ```
      If singletons are not wanted, an optional flag can be provided at lookup.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter', { singleton: false });
     let twitter2 = container.lookup('api:twitter', { singleton: false });
      twitter === twitter2; //=> false
     ```
      @private
     @method lookup
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] The fullname of the request source (used for local lookup)
     @return {any}
     */

    Container.prototype.lookup = function (fullName, options) {
      true && !this.registry.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.registry.isValidFullName(fullName));

      return _lookup(this, this.registry.normalize(fullName), options);
    };

    Container.prototype.destroy = function () {
      destroyDestroyables(this);
      this.isDestroying = true;
    };

    Container.prototype.finalizeDestroy = function () {
      resetCache(this);
      this.isDestroyed = true;
    };

    Container.prototype.reset = function (fullName) {
      if (this.isDestroyed) return;
      if (fullName === undefined) {
        destroyDestroyables(this);
        resetCache(this);
      } else {
        resetMember(this, this.registry.normalize(fullName));
      }
    };

    Container.prototype.ownerInjection = function () {
      var _ref;

      return _ref = {}, _ref[_emberUtils.OWNER] = this.owner, _ref;
    };

    Container.prototype.factoryFor = function (fullName) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var normalizedName = this.registry.normalize(fullName);

      true && !this.registry.isValidFullName(normalizedName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));
      true && !(_features.EMBER_MODULE_UNIFICATION || !options.namespace) && (0, _emberDebug.assert)('EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to factoryFor', _features.EMBER_MODULE_UNIFICATION || !options.namespace);

      if (options.source || options.namespace) {
        normalizedName = this.registry.expandLocalLookup(fullName, options);
        if (!normalizedName) {
          return;
        }
      }

      return _factoryFor(this, normalizedName, fullName);
    };

    return Container;
  }();

  Container._leakTracking = leakTracking;

  /*
   * Wrap a factory manager in a proxy which will not permit properties to be
   * set on the manager.
   */
  function wrapManagerInDeprecationProxy(manager) {
    var validator, m, proxiedManager, proxy;

    if (_emberUtils.HAS_NATIVE_PROXY) {
      validator = {
        set: function (obj, prop) {
          throw new Error('You attempted to set "' + prop + '" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.');
        }
      };

      // Note:
      // We have to proxy access to the manager here so that private property
      // access doesn't cause the above errors to occur.

      m = manager;
      proxiedManager = {
        class: m.class,
        create: function (props) {
          return m.create(props);
        }
      };
      proxy = new Proxy(proxiedManager, validator);

      FACTORY_FOR.set(proxy, manager);
    }

    return manager;
  }

  function isSingleton(container, fullName) {
    return container.registry.getOption(fullName, 'singleton') !== false;
  }

  function isInstantiatable(container, fullName) {
    return container.registry.getOption(fullName, 'instantiate') !== false;
  }

  function _lookup(container, fullName) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        cached;
    true && !(_features.EMBER_MODULE_UNIFICATION || !options.namespace) && (0, _emberDebug.assert)('EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to lookup', _features.EMBER_MODULE_UNIFICATION || !options.namespace);

    var normalizedName = fullName;

    if (options.source || options.namespace) {
      normalizedName = container.registry.expandLocalLookup(fullName, options);
      if (!normalizedName) {
        return;
      }
    }

    if (options.singleton !== false) {
      cached = container.cache[normalizedName];

      if (cached !== undefined) {
        return cached;
      }
    }

    return instantiateFactory(container, normalizedName, fullName, options);
  }

  function _factoryFor(container, normalizedName, fullName) {
    var cached = container.factoryManagerCache[normalizedName];

    if (cached !== undefined) {
      return cached;
    }

    var factory = container.registry.resolve(normalizedName);

    if (factory === undefined) {
      return;
    }

    if (true && factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName); // What should this pass? fullname or the normalized key?
    }

    var manager = new FactoryManager(container, factory, fullName, normalizedName);

    manager = wrapManagerInDeprecationProxy(manager);


    container.factoryManagerCache[normalizedName] = manager;
    return manager;
  }

  function isSingletonClass(container, fullName, _ref2) {
    var instantiate = _ref2.instantiate,
        singleton = _ref2.singleton;

    return singleton !== false && !instantiate && isSingleton(container, fullName) && !isInstantiatable(container, fullName);
  }

  function isSingletonInstance(container, fullName, _ref3) {
    var instantiate = _ref3.instantiate,
        singleton = _ref3.singleton;

    return singleton !== false && instantiate !== false && isSingleton(container, fullName) && isInstantiatable(container, fullName);
  }

  function isFactoryClass(container, fullname, _ref4) {
    var instantiate = _ref4.instantiate,
        singleton = _ref4.singleton;

    return instantiate === false && (singleton === false || !isSingleton(container, fullname)) && !isInstantiatable(container, fullname);
  }

  function isFactoryInstance(container, fullName, _ref5) {
    var instantiate = _ref5.instantiate,
        singleton = _ref5.singleton;

    return instantiate !== false && (singleton !== false || isSingleton(container, fullName)) && isInstantiatable(container, fullName);
  }

  function instantiateFactory(container, normalizedName, fullName, options) {
    var factoryManager = _factoryFor(container, normalizedName, fullName);

    if (factoryManager === undefined) {
      return;
    }

    // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
    // By default majority of objects fall into this case
    if (isSingletonInstance(container, fullName, options)) {
      return container.cache[normalizedName] = factoryManager.create();
    }

    // SomeClass { singleton: false, instantiate: true }
    if (isFactoryInstance(container, fullName, options)) {
      return factoryManager.create();
    }

    // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }
    if (isSingletonClass(container, fullName, options) || isFactoryClass(container, fullName, options)) {
      return factoryManager.class;
    }

    throw new Error('Could not create factory');
  }

  function processInjections(container, injections, result) {
    container.registry.validateInjections(injections);


    var hash = result.injections,
        i,
        _injections$i,
        property,
        specifier,
        source;
    if (hash === undefined) {
      hash = result.injections = {};
    }

    for (i = 0; i < injections.length; i++) {
      _injections$i = injections[i], property = _injections$i.property, specifier = _injections$i.specifier, source = _injections$i.source;


      if (source) {
        hash[property] = _lookup(container, specifier, { source: source });
      } else {
        hash[property] = _lookup(container, specifier);
      }

      if (!result.isDynamic) {
        result.isDynamic = !isSingleton(container, specifier);
      }
    }
  }

  function buildInjections(container, typeInjections, injections) {
    var result = {
      injections: undefined,
      isDyanmic: false
    };

    if (typeInjections !== undefined) {
      processInjections(container, typeInjections, result);
    }

    if (injections !== undefined) {
      processInjections(container, injections, result);
    }

    return result;
  }

  function injectionsFor(container, fullName) {
    var registry = container.registry;

    var _fullName$split = fullName.split(':'),
        type = _fullName$split[0];

    var typeInjections = registry.getTypeInjections(type);
    var injections = registry.getInjections(fullName);

    return buildInjections(container, typeInjections, injections);
  }

  function destroyDestroyables(container) {
    var cache = container.cache,
        i,
        key,
        value;
    var keys = Object.keys(cache);

    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      value = cache[key];


      if (value.destroy) {
        value.destroy();
      }
    }
  }

  function resetCache(container) {
    container.cache = (0, _emberUtils.dictionary)(null);
    container.factoryManagerCache = (0, _emberUtils.dictionary)(null);
  }

  function resetMember(container, fullName) {
    var member = container.cache[fullName];

    delete container.factoryManagerCache[fullName];

    if (member) {
      delete container.cache[fullName];

      if (member.destroy) {
        member.destroy();
      }
    }
  }

  var FACTORY_FOR = new WeakMap();

  var FactoryManager = function () {
    function FactoryManager(container, factory, fullName, normalizedName) {

      this.container = container;
      this.owner = container.owner;
      this.class = factory;
      this.fullName = fullName;
      this.normalizedName = normalizedName;
      this.madeToString = undefined;
      this.injections = undefined;
      FACTORY_FOR.set(this, this);
    }

    FactoryManager.prototype.toString = function () {
      if (this.madeToString === undefined) {
        this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
      }

      return this.madeToString;
    };

    FactoryManager.prototype.create = function (options) {
      var injectionsCache = this.injections,
          _injectionsFor,
          injections,
          isDynamic;
      if (injectionsCache === undefined) {
        _injectionsFor = injectionsFor(this.container, this.normalizedName), injections = _injectionsFor.injections, isDynamic = _injectionsFor.isDynamic;


        injectionsCache = injections;
        if (!isDynamic) {
          this.injections = injections;
        }
      }

      var props = injectionsCache;
      if (options !== undefined) {
        props = (0, _emberUtils.assign)({}, injectionsCache, options);
      }

      var lazyInjections = void 0;
      var validationCache = this.container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (!validationCache[this.fullName] && this.class && typeof this.class._lazyInjections === 'function') {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);

        this.container.registry.validateInjections(lazyInjections);
      }

      validationCache[this.fullName] = true;


      if (!this.class.create) {
        throw new Error('Failed to create an instance of \'' + this.normalizedName + '\'. Most likely an improperly defined class or' + ' an invalid module export.');
      }

      // required to allow access to things like
      // the customized toString, _debugContainerKey,
      // owner, etc. without a double extend and without
      // modifying the objects properties
      if (typeof this.class._initFactory === 'function') {
        this.class._initFactory(this);
      } else {
        // in the non-EmberObject case we need to still setOwner
        // this is required for supporting glimmer environment and
        // template instantiation which rely heavily on
        // `options[OWNER]` being passed into `create`
        // TODO: clean this up, and remove in future versions
        if (options === undefined || props === undefined) {
          // avoid mutating `props` here since they are the cached injections
          props = (0, _emberUtils.assign)({}, props);
        }
        (0, _emberUtils.setOwner)(props, this.owner);
      }

      var instance = this.class.create(props);
      FACTORY_FOR.set(instance, this);

      return instance;
    };

    return FactoryManager;
  }();

  var VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;
  var missingResolverFunctionsDeprecation = 'Passing a `resolver` function into a Registry is deprecated. Please pass in a Resolver object with a `resolve` method.';

  /**
   A registry used to store factory and option information keyed
   by type.
  
   A `Registry` stores the factory and option information needed by a
   `Container` to instantiate and cache objects.
  
   The API for `Registry` is still in flux and should not be considered stable.
  
   @private
   @class Registry
   @since 1.11.0
  */

  var Registry = function () {
    function Registry() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


      this.fallback = options.fallback || null;
      this.resolver = options.resolver || null;

      if (_emberEnvironment.ENV._ENABLE_RESOLVER_FUNCTION_SUPPORT !== true) {
        true && !(typeof this.resolver !== 'function') && (0, _emberDebug.assert)(missingResolverFunctionsDeprecation, typeof this.resolver !== 'function');
      }

      if (typeof this.resolver === 'function' && _emberEnvironment.ENV._ENABLE_RESOLVER_FUNCTION_SUPPORT === true) {
        deprecateResolverFunction(this);
      }

      this.registrations = (0, _emberUtils.dictionary)(options.registrations || null);

      this._typeInjections = (0, _emberUtils.dictionary)(null);
      this._injections = (0, _emberUtils.dictionary)(null);

      this._localLookupCache = Object.create(null);
      this._normalizeCache = (0, _emberUtils.dictionary)(null);
      this._resolveCache = (0, _emberUtils.dictionary)(null);
      this._failSet = new Set();

      this._options = (0, _emberUtils.dictionary)(null);
      this._typeOptions = (0, _emberUtils.dictionary)(null);
    }

    /**
     A backup registry for resolving registrations when no matches can be found.
      @private
     @property fallback
     @type Registry
     */

    /**
     An object that has a `resolve` method that resolves a name.
      @private
     @property resolver
     @type Resolver
     */

    /**
     @private
     @property registrations
     @type InheritingDict
     */

    /**
     @private
      @property _typeInjections
     @type InheritingDict
     */

    /**
     @private
      @property _injections
     @type InheritingDict
     */

    /**
     @private
      @property _normalizeCache
     @type InheritingDict
     */

    /**
     @private
      @property _resolveCache
     @type InheritingDict
     */

    /**
     @private
      @property _options
     @type InheritingDict
     */

    /**
     @private
      @property _typeOptions
     @type InheritingDict
     */

    /**
     Creates a container based on this registry.
      @private
     @method container
     @param {Object} options
     @return {Container} created container
     */

    Registry.prototype.container = function (options) {
      return new Container(this, options);
    };

    Registry.prototype.register = function (fullName, factory) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
      true && !(factory !== undefined) && (0, _emberDebug.assert)('Attempting to register an unknown factory: \'' + fullName + '\'', factory !== undefined);

      var normalizedName = this.normalize(fullName);
      true && !!this._resolveCache[normalizedName] && (0, _emberDebug.assert)('Cannot re-register: \'' + fullName + '\', as it has already been resolved.', !this._resolveCache[normalizedName]);

      this._failSet.delete(normalizedName);
      this.registrations[normalizedName] = factory;
      this._options[normalizedName] = options;
    };

    Registry.prototype.unregister = function (fullName) {
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var normalizedName = this.normalize(fullName);

      this._localLookupCache = Object.create(null);

      delete this.registrations[normalizedName];
      delete this._resolveCache[normalizedName];
      delete this._options[normalizedName];
      this._failSet.delete(normalizedName);
    };

    Registry.prototype.resolve = function (fullName, options) {
      var factory = _resolve(this, this.normalize(fullName), options),
          _fallback;
      if (factory === undefined && this.fallback !== null) {

        factory = (_fallback = this.fallback).resolve.apply(_fallback, arguments);
      }
      return factory;
    };

    Registry.prototype.describe = function (fullName) {
      if (this.resolver !== null && this.resolver.lookupDescription) {
        return this.resolver.lookupDescription(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.describe(fullName);
      } else {
        return fullName;
      }
    };

    Registry.prototype.normalizeFullName = function (fullName) {
      if (this.resolver !== null && this.resolver.normalize) {
        return this.resolver.normalize(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.normalizeFullName(fullName);
      } else {
        return fullName;
      }
    };

    Registry.prototype.normalize = function (fullName) {
      return this._normalizeCache[fullName] || (this._normalizeCache[fullName] = this.normalizeFullName(fullName));
    };

    Registry.prototype.makeToString = function (factory, fullName) {
      if (this.resolver !== null && this.resolver.makeToString) {
        return this.resolver.makeToString(factory, fullName);
      } else if (this.fallback !== null) {
        return this.fallback.makeToString(factory, fullName);
      } else {
        return factory.toString();
      }
    };

    Registry.prototype.has = function (fullName, options) {
      if (!this.isValidFullName(fullName)) {
        return false;
      }

      var source = options && options.source && this.normalize(options.source);
      var namespace = options && options.namespace || undefined;

      return _has(this, this.normalize(fullName), source, namespace);
    };

    Registry.prototype.optionsForType = function (type, options) {
      this._typeOptions[type] = options;
    };

    Registry.prototype.getOptionsForType = function (type) {
      var optionsForType = this._typeOptions[type];
      if (optionsForType === undefined && this.fallback !== null) {
        optionsForType = this.fallback.getOptionsForType(type);
      }
      return optionsForType;
    };

    Registry.prototype.options = function (fullName, _options) {
      var normalizedName = this.normalize(fullName);
      this._options[normalizedName] = _options;
    };

    Registry.prototype.getOptions = function (fullName) {
      var normalizedName = this.normalize(fullName);
      var options = this._options[normalizedName];

      if (options === undefined && this.fallback !== null) {
        options = this.fallback.getOptions(fullName);
      }
      return options;
    };

    Registry.prototype.getOption = function (fullName, optionName) {
      var options = this._options[fullName];

      if (options !== undefined && options[optionName] !== undefined) {
        return options[optionName];
      }

      var type = fullName.split(':')[0];
      options = this._typeOptions[type];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      } else if (this.fallback !== null) {
        return this.fallback.getOption(fullName, optionName);
      }
    };

    Registry.prototype.typeInjection = function (type, property, fullName) {
      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var fullNameType = fullName.split(':')[0];
      true && !(fullNameType !== type) && (0, _emberDebug.assert)('Cannot inject a \'' + fullName + '\' on other ' + type + '(s).', fullNameType !== type);

      var injections = this._typeInjections[type] || (this._typeInjections[type] = []);

      injections.push({ property: property, specifier: fullName });
    };

    Registry.prototype.injection = function (fullName, property, injectionName) {
      true && !this.isValidFullName(injectionName) && (0, _emberDebug.assert)('Invalid injectionName, expected: \'type:name\' got: ' + injectionName, this.isValidFullName(injectionName));

      var normalizedInjectionName = this.normalize(injectionName);

      if (fullName.indexOf(':') === -1) {
        return this.typeInjection(fullName, property, normalizedInjectionName);
      }

      true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));

      var normalizedName = this.normalize(fullName);

      var injections = this._injections[normalizedName] || (this._injections[normalizedName] = []);

      injections.push({ property: property, specifier: normalizedInjectionName });
    };

    Registry.prototype.knownForType = function (type) {
      var localKnown = (0, _emberUtils.dictionary)(null),
          index,
          fullName,
          itemType;
      var registeredNames = Object.keys(this.registrations);
      for (index = 0; index < registeredNames.length; index++) {
        fullName = registeredNames[index];
        itemType = fullName.split(':')[0];


        if (itemType === type) {
          localKnown[fullName] = true;
        }
      }

      var fallbackKnown = void 0,
          resolverKnown = void 0;
      if (this.fallback !== null) {
        fallbackKnown = this.fallback.knownForType(type);
      }

      if (this.resolver !== null && this.resolver.knownForType) {
        resolverKnown = this.resolver.knownForType(type);
      }

      return (0, _emberUtils.assign)({}, fallbackKnown, localKnown, resolverKnown);
    };

    Registry.prototype.isValidFullName = function (fullName) {
      return VALID_FULL_NAME_REGEXP.test(fullName);
    };

    Registry.prototype.getInjections = function (fullName) {
      var injections = this._injections[fullName],
          fallbackInjections;
      if (this.fallback !== null) {
        fallbackInjections = this.fallback.getInjections(fullName);


        if (fallbackInjections !== undefined) {
          injections = injections === undefined ? fallbackInjections : injections.concat(fallbackInjections);
        }
      }

      return injections;
    };

    Registry.prototype.getTypeInjections = function (type) {
      var injections = this._typeInjections[type],
          fallbackInjections;
      if (this.fallback !== null) {
        fallbackInjections = this.fallback.getTypeInjections(type);


        if (fallbackInjections !== undefined) {
          injections = injections === undefined ? fallbackInjections : injections.concat(fallbackInjections);
        }
      }

      return injections;
    };

    Registry.prototype.expandLocalLookup = function (fullName, options) {
      var normalizedFullName, normalizedSource;

      if (this.resolver !== null && this.resolver.expandLocalLookup) {
        true && !this.isValidFullName(fullName) && (0, _emberDebug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
        true && !(!options.source || this.isValidFullName(options.source)) && (0, _emberDebug.assert)('options.source must be a proper full name', !options.source || this.isValidFullName(options.source));

        normalizedFullName = this.normalize(fullName);
        normalizedSource = this.normalize(options.source);


        return _expandLocalLookup(this, normalizedFullName, normalizedSource, options.namespace);
      } else if (this.fallback !== null) {
        return this.fallback.expandLocalLookup(fullName, options);
      } else {
        return null;
      }
    };

    return Registry;
  }();

  function deprecateResolverFunction(registry) {
    true && !false && (0, _emberDebug.deprecate)(missingResolverFunctionsDeprecation, false, {
      id: 'ember-application.registry-resolver-as-function',
      until: '3.0.0',
      url: 'https://emberjs.com/deprecations/v2.x#toc_registry-resolver-as-function'
    });

    registry.resolver = { resolve: registry.resolver };
  }

  Registry.prototype.normalizeInjectionsHash = function (hash) {
    var injections = [],
        _hash$key,
        specifier,
        source,
        namespace;

    for (var key in hash) {
      if (hash.hasOwnProperty(key)) {
        _hash$key = hash[key], specifier = _hash$key.specifier, source = _hash$key.source, namespace = _hash$key.namespace;

        true && !this.isValidFullName(specifier) && (0, _emberDebug.assert)('Expected a proper full name, given \'' + specifier + '\'', this.isValidFullName(specifier));

        injections.push({
          property: key,
          specifier: specifier,
          source: source,
          namespace: namespace
        });
      }
    }

    return injections;
  };

  Registry.prototype.validateInjections = function (injections) {
    var i, _injections$i2, specifier, source, namespace;

    if (!injections) {
      return;
    }

    for (i = 0; i < injections.length; i++) {
      _injections$i2 = injections[i], specifier = _injections$i2.specifier, source = _injections$i2.source, namespace = _injections$i2.namespace;

      true && !this.has(specifier, { source: source, namespace: namespace }) && (0, _emberDebug.assert)('Attempting to inject an unknown injection: \'' + specifier + '\'', this.has(specifier, { source: source, namespace: namespace }));
    }
  };


  function _expandLocalLookup(registry, normalizedName, normalizedSource, namespace) {
    var cache = registry._localLookupCache;
    var normalizedNameCache = cache[normalizedName];

    if (!normalizedNameCache) {
      normalizedNameCache = cache[normalizedName] = Object.create(null);
    }

    var cacheKey = namespace || normalizedSource;

    var cached = normalizedNameCache[cacheKey];

    if (cached !== undefined) {
      return cached;
    }

    var expanded = registry.resolver.expandLocalLookup(normalizedName, normalizedSource, namespace);

    return normalizedNameCache[cacheKey] = expanded;
  }

  function _resolve(registry, _normalizedName, options) {
    var normalizedName = _normalizedName;
    // when `source` is provided expand normalizedName
    // and source into the full normalizedName
    if (options !== undefined && (options.source || options.namespace)) {
      normalizedName = registry.expandLocalLookup(_normalizedName, options);
      if (!normalizedName) {
        return;
      }
    }

    var cached = registry._resolveCache[normalizedName];
    if (cached !== undefined) {
      return cached;
    }
    if (registry._failSet.has(normalizedName)) {
      return;
    }

    var resolved = void 0;

    if (registry.resolver) {
      resolved = registry.resolver.resolve(normalizedName);
    }

    if (resolved === undefined) {
      resolved = registry.registrations[normalizedName];
    }

    if (resolved === undefined) {
      registry._failSet.add(normalizedName);
    } else {
      registry._resolveCache[normalizedName] = resolved;
    }

    return resolved;
  }

  function _has(registry, fullName, source, namespace) {
    return registry.resolve(fullName, { source: source, namespace: namespace }) !== undefined;
  }

  var privateNames = (0, _emberUtils.dictionary)(null);
  var privateSuffix = ('' + Math.random() + Date.now()).replace('.', '');

  /*
  Public API for the container is still in flux.
  The public API, specified on the application namespace should be considered the stable API.
  // @module container
    @private
  */

  exports.Registry = Registry;
  exports.privatize = function (_ref6) {
    var fullName = _ref6[0];

    var name = privateNames[fullName];
    if (name) {
      return name;
    }

    var _fullName$split2 = fullName.split(':'),
        type = _fullName$split2[0],
        rawName = _fullName$split2[1];

    return privateNames[fullName] = (0, _emberUtils.intern)(type + ':' + rawName + '-' + privateSuffix);
  };
  exports.Container = Container;
  exports.FACTORY_FOR = FACTORY_FOR;
});
enifed('ember-babel', ['exports'], function (exports) {
  'use strict';

  exports.inherits = function (subClass, superClass) {
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });

    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : defaults(subClass, superClass);
  };
  exports.taggedTemplateLiteralLoose = function (strings, raw) {
    strings.raw = raw;
    return strings;
  };
  exports.createClass = function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
  exports.defaults = defaults;


  function defineProperties(target, props) {
    var i, descriptor;

    for (i = 0; i < props.length; i++) {
      descriptor = props[i];

      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function defaults(obj, defaults) {
    var keys = Object.getOwnPropertyNames(defaults),
        i,
        key,
        value;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      value = Object.getOwnPropertyDescriptor(defaults, key);

      if (value && value.configurable && obj[key] === undefined) {
        Object.defineProperty(obj, key, value);
      }
    }
    return obj;
  }

  exports.possibleConstructorReturn = function (self, call) {
    return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
  };

  exports.slice = Array.prototype.slice;
});
enifed('ember-console', ['exports', 'ember-debug'], function (exports, _emberDebug) {
  'use strict';

  // Deliver message that the function is deprecated

  var DEPRECATION_MESSAGE = 'Use of Ember.Logger is deprecated. Please use `console` for logging.';
  var DEPRECATION_ID = 'ember-console.deprecate-logger';
  var DEPRECATION_URL = 'https://emberjs.com/deprecations/v3.x#toc_use-console-rather-than-ember-logger';
  /**
     @module ember
  */
  /**
    Inside Ember-Metal, simply uses the methods from `imports.console`.
    Override this to provide more robust logging functionality.
  
    @class Logger
    @deprecated Use 'console' instead
  
    @namespace Ember
    @public
  */


  exports.default = {
    log: function () {
      var _console;

      true && !false && (0, _emberDebug.deprecate)(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL
      });

      return (_console = console).log.apply(_console, arguments); // eslint-disable-line no-console
    },
    warn: function () {
      var _console2;

      true && !false && (0, _emberDebug.deprecate)(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL
      });

      return (_console2 = console).warn.apply(_console2, arguments); // eslint-disable-line no-console
    },
    error: function () {
      var _console3;

      true && !false && (0, _emberDebug.deprecate)(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL
      });

      return (_console3 = console).error.apply(_console3, arguments); // eslint-disable-line no-console
    },
    info: function () {
      var _console4;

      true && !false && (0, _emberDebug.deprecate)(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL
      });

      return (_console4 = console).info.apply(_console4, arguments); // eslint-disable-line no-console
    },
    debug: function () {
      var _console6, _console5;

      true && !false && (0, _emberDebug.deprecate)(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL
      });

      /* eslint-disable no-console */
      if (console.debug) {

        return (_console5 = console).debug.apply(_console5, arguments);
      }
      return (_console6 = console).info.apply(_console6, arguments);
      /* eslint-enable no-console */
    },
    assert: function () {
      var _console7;

      true && !false && (0, _emberDebug.deprecate)(DEPRECATION_MESSAGE, false, {
        id: DEPRECATION_ID,
        until: '4.0.0',
        url: DEPRECATION_URL
      });

      return (_console7 = console).assert.apply(_console7, arguments); // eslint-disable-line no-console
    }
  };
});
enifed('ember-debug/index', ['exports', 'ember-debug/lib/warn', 'ember-debug/lib/deprecate', 'ember-debug/lib/features', 'ember-debug/lib/error', 'ember-debug/lib/testing', 'ember-environment', 'ember/features'], function (exports, _warn2, _deprecate2, _features, _error, _testing, _emberEnvironment, _features2) {
  'use strict';

  exports._warnIfUsingStrippedFeatureFlags = exports.getDebugFunction = exports.setDebugFunction = exports.deprecateFunc = exports.runInDebug = exports.debugFreeze = exports.debugSeal = exports.deprecate = exports.debug = exports.warn = exports.info = exports.assert = exports.setTesting = exports.isTesting = exports.Error = exports.isFeatureEnabled = exports.registerDeprecationHandler = exports.registerWarnHandler = undefined;
  Object.defineProperty(exports, 'registerWarnHandler', {
    enumerable: true,
    get: function () {
      return _warn2.registerHandler;
    }
  });
  Object.defineProperty(exports, 'registerDeprecationHandler', {
    enumerable: true,
    get: function () {
      return _deprecate2.registerHandler;
    }
  });
  Object.defineProperty(exports, 'isFeatureEnabled', {
    enumerable: true,
    get: function () {
      return _features.default;
    }
  });
  Object.defineProperty(exports, 'Error', {
    enumerable: true,
    get: function () {
      return _error.default;
    }
  });
  Object.defineProperty(exports, 'isTesting', {
    enumerable: true,
    get: function () {
      return _testing.isTesting;
    }
  });
  Object.defineProperty(exports, 'setTesting', {
    enumerable: true,
    get: function () {
      return _testing.setTesting;
    }
  });
  var DEFAULT_FEATURES = _features2.DEFAULT_FEATURES,
      FEATURES = _features2.FEATURES,
      featuresWereStripped,
      isFirefox,
      isChrome;

  // These are the default production build versions:
  var noop = function () {};

  var assert = noop;
  var info = noop;
  var warn = noop;
  var debug = noop;
  var deprecate = noop;
  var debugSeal = noop;
  var debugFreeze = noop;
  var runInDebug = noop;
  var setDebugFunction = noop;
  var getDebugFunction = noop;

  var deprecateFunc = function () {
    return arguments[arguments.length - 1];
  };

  exports.setDebugFunction = setDebugFunction = function (type, callback) {
    switch (type) {
      case 'assert':
        return exports.assert = assert = callback;
      case 'info':
        return exports.info = info = callback;
      case 'warn':
        return exports.warn = warn = callback;
      case 'debug':
        return exports.debug = debug = callback;
      case 'deprecate':
        return exports.deprecate = deprecate = callback;
      case 'debugSeal':
        return exports.debugSeal = debugSeal = callback;
      case 'debugFreeze':
        return exports.debugFreeze = debugFreeze = callback;
      case 'runInDebug':
        return exports.runInDebug = runInDebug = callback;
      case 'deprecateFunc':
        return exports.deprecateFunc = deprecateFunc = callback;
    }
  };

  exports.getDebugFunction = getDebugFunction = function (type) {
    switch (type) {
      case 'assert':
        return assert;
      case 'info':
        return info;
      case 'warn':
        return warn;
      case 'debug':
        return debug;
      case 'deprecate':
        return deprecate;
      case 'debugSeal':
        return debugSeal;
      case 'debugFreeze':
        return debugFreeze;
      case 'runInDebug':
        return runInDebug;
      case 'deprecateFunc':
        return deprecateFunc;
    }
  };

  /**
  @module @ember/debug
  */

  /**
    Verify that a certain expectation is met, or throw a exception otherwise.
     This is useful for communicating assumptions in the code to other human
    readers as well as catching bugs that accidentally violates these
    expectations.
     Assertions are removed from production builds, so they can be freely added
    for documentation and debugging purposes without worries of incuring any
    performance penalty. However, because of that, they should not be used for
    checks that could reasonably fail during normal usage. Furthermore, care
    should be taken to avoid accidentally relying on side-effects produced from
    evaluating the condition itself, since the code will not run in production.
     ```javascript
    import { assert } from '@ember/debug';
     // Test for truthiness
    assert('Must pass a string', typeof str === 'string');
     // Fail unconditionally
    assert('This code path should never be run');
    ```
     @method assert
    @static
    @for @ember/debug
    @param {String} description Describes the expectation. This will become the
      text of the Error thrown if the assertion fails.
    @param {Boolean} condition Must be truthy for the assertion to pass. If
      falsy, an exception will be thrown.
    @public
    @since 1.0.0
  */
  setDebugFunction('assert', function (desc, test) {
    if (!test) {
      throw new _error.default('Assertion Failed: ' + desc);
    }
  });

  /**
    Display a debug notice.
     Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
     ```javascript
    import { debug } from '@ember/debug';
     debug('I\'m a debug notice!');
    ```
     @method debug
    @for @ember/debug
    @static
    @param {String} message A debug message to display.
    @public
  */
  setDebugFunction('debug', function (message) {
    /* eslint-disable no-console */
    if (console.debug) {
      console.debug('DEBUG: ' + message);
    } else {
      console.log('DEBUG: ' + message);
    }
    /* eslint-ensable no-console */
  });

  /**
    Display an info notice.
     Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
     @method info
    @private
  */
  setDebugFunction('info', function () {
    var _console;

    (_console = console).info.apply(_console, arguments); /* eslint-disable-line no-console */
  });

  /**
   @module @ember/application
   @public
  */

  /**
    Alias an old, deprecated method with its new counterpart.
     Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only) when the assigned method is called.
     Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
     ```javascript
    import { deprecateFunc } from '@ember/application/deprecations';
     Ember.oldMethod = deprecateFunc('Please use the new, updated method', options, Ember.newMethod);
    ```
     @method deprecateFunc
    @static
    @for @ember/application/deprecations
    @param {String} message A description of the deprecation.
    @param {Object} [options] The options object for `deprecate`.
    @param {Function} func The new function called to replace its deprecated counterpart.
    @return {Function} A new function that wraps the original function with a deprecation warning
    @private
  */
  setDebugFunction('deprecateFunc', function () {
    var _len, args, _key, message, options, func, _message, _func;

    for (_len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (args.length === 3) {
      message = args[0], options = args[1], func = args[2];


      return function () {
        deprecate(message, false, options);
        return func.apply(this, arguments);
      };
    } else {
      _message = args[0], _func = args[1];


      return function () {
        deprecate(_message);
        return _func.apply(this, arguments);
      };
    }
  });

  /**
   @module @ember/debug
   @public
  */
  /**
    Run a function meant for debugging.
     Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.
     ```javascript
    import Component from '@ember/component';
    import { runInDebug } from '@ember/debug';
     runInDebug(() => {
      Component.reopen({
        didInsertElement() {
          console.log("I'm happy");
        }
      });
    });
    ```
     @method runInDebug
    @for @ember/debug
    @static
    @param {Function} func The function to be executed.
    @since 1.5.0
    @public
  */
  setDebugFunction('runInDebug', function (func) {
    func();
  });

  setDebugFunction('debugSeal', function (obj) {
    Object.seal(obj);
  });

  setDebugFunction('debugFreeze', function (obj) {
    Object.freeze(obj);
  });

  setDebugFunction('deprecate', _deprecate2.default);

  setDebugFunction('warn', _warn2.default);


  var _warnIfUsingStrippedFeatureFlags = void 0;

  if (true && !(0, _testing.isTesting)()) {
    /**
       Will call `warn()` if ENABLE_OPTIONAL_FEATURES or
       any specific FEATURES flag is truthy.
        This method is called automatically in debug canary builds.
        @private
       @method _warnIfUsingStrippedFeatureFlags
       @return {void}
    */
    exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags = function (FEATURES, knownFeatures, featuresWereStripped) {
      var keys, i, key;

      if (featuresWereStripped) {
        warn('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.', !_emberEnvironment.ENV.ENABLE_OPTIONAL_FEATURES, { id: 'ember-debug.feature-flag-with-features-stripped' });

        keys = Object.keys(FEATURES || {});

        for (i = 0; i < keys.length; i++) {
          key = keys[i];

          if (key === 'isEnabled' || !(key in knownFeatures)) {
            continue;
          }

          warn('FEATURE["' + key + '"] is set as enabled, but FEATURE flags are only available in canary builds.', !FEATURES[key], { id: 'ember-debug.feature-flag-with-features-stripped' });
        }
      }
    };

    // Complain if they're using FEATURE flags in builds other than canary
    FEATURES['features-stripped-test'] = true;
    featuresWereStripped = true;


    if ((0, _features.default)('features-stripped-test')) {
      featuresWereStripped = false;
    }

    delete FEATURES['features-stripped-test'];
    _warnIfUsingStrippedFeatureFlags(_emberEnvironment.ENV.FEATURES, DEFAULT_FEATURES, featuresWereStripped);

    // Inform the developer about the Ember Inspector if not installed.
    isFirefox = _emberEnvironment.environment.isFirefox;
    isChrome = _emberEnvironment.environment.isChrome;


    if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
      window.addEventListener('load', function () {
        var downloadURL;

        if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
          downloadURL = void 0;


          if (isChrome) {
            downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug('For more advanced debugging, install the Ember Inspector from ' + downloadURL);
        }
      }, false);
    }
  }

  exports.assert = assert;
  exports.info = info;
  exports.warn = warn;
  exports.debug = debug;
  exports.deprecate = deprecate;
  exports.debugSeal = debugSeal;
  exports.debugFreeze = debugFreeze;
  exports.runInDebug = runInDebug;
  exports.deprecateFunc = deprecateFunc;
  exports.setDebugFunction = setDebugFunction;
  exports.getDebugFunction = getDebugFunction;
  exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;
});
enifed('ember-debug/lib/deprecate', ['exports', 'ember-debug/lib/error', 'ember-environment', 'ember-debug/index', 'ember-debug/lib/handlers'], function (exports, _error, _emberEnvironment, _index, _handlers) {
  'use strict';

  exports.missingOptionsUntilDeprecation = exports.missingOptionsIdDeprecation = exports.missingOptionsDeprecation = exports.registerHandler = undefined;

  /**
   @module @ember/debug
   @public
  */
  /**
    Allows for runtime registration of handler functions that override the default deprecation behavior.
    Deprecations are invoked by calls to [@ember/application/deprecations/deprecate](https://emberjs.com/api/ember/release/classes/@ember%2Fapplication%2Fdeprecations/methods/deprecate?anchor=deprecate).
    The following example demonstrates its usage by registering a handler that throws an error if the
    message contains the word "should", otherwise defers to the default handler.
  
    ```javascript
    import { registerDeprecationHandler } from '@ember/debug';
  
    registerDeprecationHandler((message, options, next) => {
      if (message.indexOf('should') !== -1) {
        throw new Error(`Deprecation message with should: ${message}`);
      } else {
        // defer to whatever handler was registered before this one
        next(message, options);
      }
    });
    ```
  
    The handler function takes the following arguments:
  
    <ul>
      <li> <code>message</code> - The message received from the deprecation call.</li>
      <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
          <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
  
    @public
    @static
    @method registerDeprecationHandler
    @for @ember/debug
    @param handler {Function} A function to handle deprecation calls.
    @since 2.1.0
  */
  var registerHandler = function () {}; /*global __fail__*/

  var missingOptionsDeprecation = void 0,
      missingOptionsIdDeprecation = void 0,
      missingOptionsUntilDeprecation = void 0,
      deprecate = void 0;

  exports.registerHandler = registerHandler = function (handler) {
    (0, _handlers.registerHandler)('deprecate', handler);
  };

  var formatMessage = function (_message, options) {
    var message = _message;

    if (options && options.id) {
      message = message + (' [deprecation id: ' + options.id + ']');
    }

    if (options && options.url) {
      message += ' See ' + options.url + ' for more details.';
    }

    return message;
  };

  registerHandler(function (message, options) {
    var updatedMessage = formatMessage(message, options);
    console.warn('DEPRECATION: ' + updatedMessage); // eslint-disable-line no-console
  });

  var captureErrorForStack = void 0;

  if (new Error().stack) {
    captureErrorForStack = function () {
      return new Error();
    };
  } else {
    captureErrorForStack = function () {
      try {
        __fail__.fail();
      } catch (e) {
        return e;
      }
    };
  }

  registerHandler(function (message, options, next) {
    var stackStr, error, stack, updatedMessage;

    if (_emberEnvironment.ENV.LOG_STACKTRACE_ON_DEPRECATION) {
      stackStr = '';
      error = captureErrorForStack();
      stack = void 0;


      if (error.stack) {
        if (error['arguments']) {
          // Chrome
          stack = error.stack.replace(/^\s+at\s+/gm, '').replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
          stack.shift();
        } else {
          // Firefox
          stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
        }

        stackStr = '\n    ' + stack.slice(2).join('\n    ');
      }

      updatedMessage = formatMessage(message, options);


      console.warn('DEPRECATION: ' + updatedMessage + stackStr); // eslint-disable-line no-console
    } else {
      next.apply(undefined, arguments);
    }
  });

  registerHandler(function (message, options, next) {
    var updatedMessage;

    if (_emberEnvironment.ENV.RAISE_ON_DEPRECATION) {
      updatedMessage = formatMessage(message);


      throw new _error.default(updatedMessage);
    } else {
      next.apply(undefined, arguments);
    }
  });

  exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `deprecate` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include `id` and `until` properties.';
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `deprecate` you must provide `id` in options.';
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation = 'When calling `deprecate` you must provide `until` in options.';
  /**
   @module @ember/application
   @public
   */
  /**
    Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only).
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     @method deprecate
    @for @ember/application/deprecations
    @param {String} message A description of the deprecation.
    @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
    @param {Object} options
    @param {String} options.id A unique id for this deprecation. The id can be
      used by Ember debugging tools to change the behavior (raise, log or silence)
      for that specific deprecation. The id should be namespaced by dots, e.g.
      "view.helper.select".
    @param {string} options.until The version of Ember when this deprecation
      warning will be removed.
    @param {String} [options.url] An optional url to the transition guide on the
      emberjs.com website.
    @static
    @public
    @since 1.0.0
  */
  deprecate = function deprecate(message, test, options) {
    if (_emberEnvironment.ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT !== true) {
      (0, _index.assert)(missingOptionsDeprecation, options && (options.id || options.until));
      (0, _index.assert)(missingOptionsIdDeprecation, options.id);
      (0, _index.assert)(missingOptionsUntilDeprecation, options.until);
    }

    if ((!options || !options.id && !options.until) && _emberEnvironment.ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT === true) {
      deprecate(missingOptionsDeprecation, false, {
        id: 'ember-debug.deprecate-options-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    if (options && !options.id && _emberEnvironment.ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT === true) {
      deprecate(missingOptionsIdDeprecation, false, {
        id: 'ember-debug.deprecate-id-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    if (options && !options.until && _emberEnvironment.ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT === true) {
      deprecate(missingOptionsUntilDeprecation, options && options.until, {
        id: 'ember-debug.deprecate-until-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    _handlers.invoke.apply(undefined, ['deprecate'].concat(Array.prototype.slice.call(arguments)));
  };


  exports.default = deprecate;
  exports.registerHandler = registerHandler;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation;
});
enifed("ember-debug/lib/error", ["exports", "ember-babel"], function (exports, _emberBabel) {
  "use strict";

  /**
   @module @ember/error
  */

  /**
    A subclass of the JavaScript Error object for use in Ember.
  
    @class EmberError
    @extends Error
    @constructor
    @public
  */

  var EmberError = function (_ExtendBuiltin) {
    (0, _emberBabel.inherits)(EmberError, _ExtendBuiltin);

    function EmberError(message) {

      var _this = (0, _emberBabel.possibleConstructorReturn)(this, _ExtendBuiltin.call(this)),
          _ret;

      if (!(_this instanceof EmberError)) {

        return _ret = new EmberError(message), (0, _emberBabel.possibleConstructorReturn)(_this, _ret);
      }

      var error = Error.call(_this, message);
      _this.stack = error.stack;
      _this.description = error.description;
      _this.fileName = error.fileName;
      _this.lineNumber = error.lineNumber;
      _this.message = error.message;
      _this.name = error.name;
      _this.number = error.number;
      _this.code = error.code;
      return _this;
    }

    return EmberError;
  }(function (klass) {
    function ExtendableBuiltin() {
      klass.apply(this, arguments);
    }

    ExtendableBuiltin.prototype = Object.create(klass.prototype);
    ExtendableBuiltin.prototype.constructor = ExtendableBuiltin;
    return ExtendableBuiltin;
  }(Error));

  exports.default = EmberError;
});
enifed('ember-debug/lib/features', ['exports', 'ember-environment', 'ember/features'], function (exports, _emberEnvironment, _features) {
  'use strict';

  exports.default =

  /**
   @module ember
  */

  /**
    The hash of enabled Canary features. Add to this, any canary features
    before creating your application.
  
    Alternatively (and recommended), you can also define `EmberENV.FEATURES`
    if you need to enable features flagged at runtime.
  
    @class FEATURES
    @namespace Ember
    @static
    @since 1.1.0
    @public
  */

  // Auto-generated

  /**
    Determine whether the specified `feature` is enabled. Used by Ember's
    build tools to exclude experimental features from beta/stable builds.
  
    You can define the following configuration options:
  
    * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
      enabled/disabled.
  
    @method isEnabled
    @param {String} feature The feature to check
    @return {Boolean}
    @for Ember.FEATURES
    @since 1.1.0
    @public
  */
  function (feature) {
    var featureValue = FEATURES[feature];

    if (featureValue === true || featureValue === false || featureValue === undefined) {
      return featureValue;
    } else if (_emberEnvironment.ENV.ENABLE_OPTIONAL_FEATURES) {
      return true;
    } else {
      return false;
    }
  };
  var FEATURES = _features.FEATURES;
});
enifed('ember-debug/lib/handlers', ['exports'], function (exports) {
  'use strict';

  var HANDLERS = exports.HANDLERS = {};

  var registerHandler = function () {};
  var invoke = function () {};

  exports.registerHandler = registerHandler = function (type, callback) {
    var nextHandler = HANDLERS[type] || function () {};

    HANDLERS[type] = function (message, options) {
      callback(message, options, nextHandler);
    };
  };

  exports.invoke = invoke = function (type, message, test, options) {
    if (test) {
      return;
    }

    var handlerForType = HANDLERS[type];

    if (handlerForType) {
      handlerForType(message, options);
    }
  };


  exports.registerHandler = registerHandler;
  exports.invoke = invoke;
});
enifed("ember-debug/lib/testing", ["exports"], function (exports) {
  "use strict";

  exports.isTesting = isTesting;
  exports.setTesting = function (value) {
    testing = !!value;
  };
  var testing = false;

  function isTesting() {
    return testing;
  }
});
enifed('ember-debug/lib/warn', ['exports', 'ember-environment', 'ember-debug/lib/deprecate', 'ember-debug/index', 'ember-debug/lib/handlers'], function (exports, _emberEnvironment, _deprecate, _index, _handlers) {
  'use strict';

  exports.missingOptionsDeprecation = exports.missingOptionsIdDeprecation = exports.registerHandler = undefined;

  var registerHandler = function () {};
  var warn = function () {};
  var missingOptionsDeprecation = void 0,
      missingOptionsIdDeprecation = void 0;

  /**
  @module @ember/debug
  */

  /**
    Allows for runtime registration of handler functions that override the default warning behavior.
    Warnings are invoked by calls made to [@ember/debug/warn](https://emberjs.com/api/ember/release/classes/@ember%2Fdebug/methods/warn?anchor=warn).
    The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
    default warning behavior.
     ```javascript
    import { registerWarnHandler } from '@ember/debug';
     // next is not called, so no warnings get the default behavior
    registerWarnHandler(() => {});
    ```
     The handler function takes the following arguments:
     <ul>
      <li> <code>message</code> - The message received from the warn call. </li>
      <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
     @public
    @static
    @method registerWarnHandler
    @for @ember/debug
    @param handler {Function} A function to handle warnings.
    @since 2.1.0
  */
  exports.registerHandler = registerHandler = function (handler) {
    (0, _handlers.registerHandler)('warn', handler);
  };

  registerHandler(function (message) {
    /* eslint-disable no-console */
    console.warn('WARNING: ' + message);
    if (console.trace) {
      console.trace();
    }
    /* eslint-enable no-console */
  });

  exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `warn` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include an `id` property.';
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';

  /**
    Display a warning with the provided message.
     * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.
     @method warn
    @for @ember/debug
    @static
    @param {String} message A warning to display.
    @param {Boolean} test An optional boolean. If falsy, the warning
      will be displayed.
    @param {Object} options An object that can be used to pass a unique
      `id` for this warning.  The `id` can be used by Ember debugging tools
      to change the behavior (raise, log, or silence) for that specific warning.
      The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
    @public
    @since 1.0.0
  */
  warn = function (message, test, options) {
    if (arguments.length === 2 && typeof test === 'object') {
      options = test;
      test = false;
    }

    if (_emberEnvironment.ENV._ENABLE_WARN_OPTIONS_SUPPORT !== true) {
      (0, _index.assert)(missingOptionsDeprecation, options);
      (0, _index.assert)(missingOptionsIdDeprecation, options && options.id);
    }

    if (!options && _emberEnvironment.ENV._ENABLE_WARN_OPTIONS_SUPPORT === true) {
      (0, _deprecate.default)(missingOptionsDeprecation, false, {
        id: 'ember-debug.warn-options-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    if (options && !options.id && _emberEnvironment.ENV._ENABLE_WARN_OPTIONS_SUPPORT === true) {
      (0, _deprecate.default)(missingOptionsIdDeprecation, false, {
        id: 'ember-debug.warn-id-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options'
      });
    }

    (0, _handlers.invoke)('warn', message, test, options);
  };


  exports.default = warn;
  exports.registerHandler = registerHandler;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
});
enifed('ember-environment', ['exports'], function (exports) {
  'use strict';

  /* globals global, window, self, mainContext */

  // from lodash to catch fake globals

  function checkGlobal(value) {
    return value && value.Object === Object ? value : undefined;
  }

  // element ids can ruin global miss checks


  // export real global
  var global$1 = checkGlobal(function (value) {
    return value && value.nodeType === undefined ? value : undefined;
  }(typeof global === 'object' && global)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode

  function defaultTrue(v) {
    return v === false ? false : true;
  }

  function defaultFalse(v) {
    return v === true ? true : false;
  }

  /**
    The hash of environment variables used to control various configuration
    settings. To specify your own or override default settings, add the
    desired properties to a global hash named `EmberENV` (or `ENV` for
    backwards compatibility with earlier versions of Ember). The `EmberENV`
    hash must be created before loading Ember.
  
    @class EmberENV
    @type Object
    @public
  */
  var ENV = typeof global$1.EmberENV === 'object' && global$1.EmberENV || typeof global$1.ENV === 'object' && global$1.ENV || {};

  // ENABLE_ALL_FEATURES was documented, but you can't actually enable non optional features.
  if (ENV.ENABLE_ALL_FEATURES) {
    ENV.ENABLE_OPTIONAL_FEATURES = true;
  }

  /**
    Determines whether Ember should add to `Array`, `Function`, and `String`
    native object prototypes, a few extra methods in order to provide a more
    friendly API.
  
    We generally recommend leaving this option set to true however, if you need
    to turn it off, you can add the configuration property
    `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
  
    Note, when disabled (the default configuration for Ember Addons), you will
    instead have to access all methods and functions from the Ember
    namespace.
  
    @property EXTEND_PROTOTYPES
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  ENV.EXTEND_PROTOTYPES = function (obj) {
    if (obj === false) {
      return { String: false, Array: false, Function: false };
    } else if (!obj || obj === true) {
      return { String: true, Array: true, Function: true };
    } else {
      return {
        String: defaultTrue(obj.String),
        Array: defaultTrue(obj.Array),
        Function: defaultTrue(obj.Function)
      };
    }
  }(ENV.EXTEND_PROTOTYPES);

  /**
    The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
    a full stack trace during deprecation warnings.
  
    @property LOG_STACKTRACE_ON_DEPRECATION
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  ENV.LOG_STACKTRACE_ON_DEPRECATION = defaultTrue(ENV.LOG_STACKTRACE_ON_DEPRECATION);

  /**
    The `LOG_VERSION` property, when true, tells Ember to log versions of all
    dependent libraries in use.
  
    @property LOG_VERSION
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  ENV.LOG_VERSION = defaultTrue(ENV.LOG_VERSION);

  ENV.RAISE_ON_DEPRECATION = defaultFalse(ENV.RAISE_ON_DEPRECATION);

  /**
    Whether to insert a `<div class="ember-view" />` wrapper around the
    application template. See RFC #280.
  
    This is not intended to be set directly, as the implementation may change in
    the future. Use `@ember/optional-features` instead.
  
    @property _APPLICATION_TEMPLATE_WRAPPER
    @for EmberENV
    @type Boolean
    @default true
    @private
  */
  ENV._APPLICATION_TEMPLATE_WRAPPER = defaultTrue(ENV._APPLICATION_TEMPLATE_WRAPPER);

  /**
    Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
    components semantics) for template-only components. See RFC #278.
  
    This is not intended to be set directly, as the implementation may change in
    the future. Use `@ember/optional-features` instead.
  
    @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
    @for EmberENV
    @type Boolean
    @default false
    @private
  */
  ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = defaultFalse(ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS);

  // check if window exists and actually is the global
  var hasDOM = typeof window !== 'undefined' && window === global$1 && window.document && window.document.createElement && !ENV.disableBrowserEnvironment; // is this a public thing?

  // legacy imports/exports/lookup stuff (should we keep this??)
  var originalContext = global$1.Ember || {};

  var context = {
    // import jQuery
    imports: originalContext.imports || global$1,
    // export Ember
    exports: originalContext.exports || global$1,
    // search for Namespaces
    lookup: originalContext.lookup || global$1
  };

  // TODO: cleanup single source of truth issues with this stuff
  var environment = hasDOM ? {
    hasDOM: true,
    isChrome: !!window.chrome && !window.opera,
    isFirefox: typeof InstallTrigger !== 'undefined',
    location: window.location,
    history: window.history,
    userAgent: window.navigator.userAgent,
    window: window
  } : {
    hasDOM: false,
    isChrome: false,
    isFirefox: false,
    location: null,
    history: null,
    userAgent: 'Lynx (textmode)',
    window: null
  };

  exports.ENV = ENV;
  exports.getENV = function () {
    return ENV;
  };
  exports.context = context;
  exports.getLookup = function () {
    return context.lookup;
  };
  exports.setLookup = function (value) {
    context.lookup = value;
  };
  exports.environment = environment;
});
enifed('ember-template-compiler/index', ['exports', 'ember-template-compiler/lib/system/precompile', 'ember-template-compiler/lib/system/compile', 'ember-template-compiler/lib/system/compile-options', 'ember-template-compiler/lib/plugins/index', 'ember/features', 'ember-environment', 'ember/version', 'ember-template-compiler/lib/compat', 'ember-template-compiler/lib/system/bootstrap', 'ember-template-compiler/lib/system/initializer'], function (exports, _precompile, _compile, _compileOptions, _index, _features, _emberEnvironment, _version, _compat) {
  'use strict';

  exports.defaultPlugins = exports.unregisterPlugin = exports.registerPlugin = exports.compileOptions = exports.compile = exports.precompile = exports._Ember = undefined;
  Object.defineProperty(exports, 'precompile', {
    enumerable: true,
    get: function () {
      return _precompile.default;
    }
  });
  Object.defineProperty(exports, 'compile', {
    enumerable: true,
    get: function () {
      return _compile.default;
    }
  });
  Object.defineProperty(exports, 'compileOptions', {
    enumerable: true,
    get: function () {
      return _compileOptions.default;
    }
  });
  Object.defineProperty(exports, 'registerPlugin', {
    enumerable: true,
    get: function () {
      return _compileOptions.registerPlugin;
    }
  });
  Object.defineProperty(exports, 'unregisterPlugin', {
    enumerable: true,
    get: function () {
      return _compileOptions.unregisterPlugin;
    }
  });
  Object.defineProperty(exports, 'defaultPlugins', {
    enumerable: true,
    get: function () {
      return _index.default;
    }
  });
  var _Ember = exports._Ember = typeof _emberEnvironment.context.imports.Ember === 'object' && _emberEnvironment.context.imports.Ember || {};

  // private API used by ember-cli-htmlbars to setup ENV and FEATURES
  if (!_Ember.ENV) {
    _Ember.ENV = _emberEnvironment.ENV;
  }
  if (!_Ember.FEATURES) {
    _Ember.FEATURES = _features.FEATURES;
  }
  if (!_Ember.VERSION) {
    _Ember.VERSION = _version.default;
  }

  // used for adding Ember.Handlebars.compile for backwards compat

  (0, _compat.default)(_Ember);

  // used to bootstrap templates


  // add domTemplates initializer (only does something if `ember-template-compiler`
  // is loaded already)
});
enifed('ember-template-compiler/lib/compat', ['exports', 'ember-template-compiler/lib/system/precompile', 'ember-template-compiler/lib/system/compile', 'ember-template-compiler/lib/system/compile-options'], function (exports, _precompile, _compile, _compileOptions) {
  'use strict';

  exports.default = function (Ember) {
    var EmberHandlebars = Ember.Handlebars;
    if (!EmberHandlebars) {
      Ember.Handlebars = EmberHandlebars = {};
    }

    var EmberHTMLBars = Ember.HTMLBars;
    if (!EmberHTMLBars) {
      Ember.HTMLBars = EmberHTMLBars = {};
    }

    EmberHTMLBars.precompile = EmberHandlebars.precompile = _precompile.default;
    EmberHTMLBars.compile = EmberHandlebars.compile = _compile.default;
    EmberHTMLBars.registerPlugin = _compileOptions.registerPlugin;
  };
});
enifed('ember-template-compiler/lib/plugins/assert-if-helper-without-arguments', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'assert-if-helper-without-arguments',

      visitor: {
        BlockStatement: function (node) {
          if (isInvalidBlockIf(node)) {
            true && !false && (0, _emberDebug.assert)(blockAssertMessage(node.path.original) + ' ' + (0, _calculateLocationDisplay.default)(moduleName, node.loc));
          }
        },
        MustacheStatement: function (node) {
          if (isInvalidInlineIf(node)) {
            true && !false && (0, _emberDebug.assert)(inlineAssertMessage(node.path.original) + ' ' + (0, _calculateLocationDisplay.default)(moduleName, node.loc));
          }
        },
        SubExpression: function (node) {
          if (isInvalidInlineIf(node)) {
            true && !false && (0, _emberDebug.assert)(inlineAssertMessage(node.path.original) + ' ' + (0, _calculateLocationDisplay.default)(moduleName, node.loc));
          }
        }
      }
    };
  };


  function blockAssertMessage(original) {
    return '#' + original + ' requires a single argument.';
  }

  function inlineAssertMessage(original) {
    return 'The inline form of the \'' + original + '\' helper expects two or three arguments.';
  }

  function isInvalidInlineIf(node) {
    return node.path.original === 'if' && (!node.params || node.params.length < 2 || node.params.length > 3);
  }

  function isInvalidBlockIf(node) {
    return node.path.original === 'if' && (!node.params || node.params.length !== 1);
  }
});
enifed('ember-template-compiler/lib/plugins/assert-input-helper-without-block', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'assert-input-helper-without-block',

      visitor: {
        BlockStatement: function (node) {
          if (node.path.original !== 'input') {
            return;
          }

          true && !false && (0, _emberDebug.assert)(assertMessage(moduleName, node));
        }
      }
    };
  };


  function assertMessage(moduleName, node) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);

    return 'The {{input}} helper cannot be used in block form. ' + sourceInformation;
  }
});
enifed('ember-template-compiler/lib/plugins/assert-reserved-named-arguments', ['exports', 'ember-debug', 'ember/features', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _features, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'assert-reserved-named-arguments',

      visitor: {
        PathExpression: function (_ref) {
          var original = _ref.original,
              loc = _ref.loc;

          if (isReserved(original)) {
            true && !false && (0, _emberDebug.assert)(assertMessage(original) + ' ' + (0, _calculateLocationDisplay.default)(moduleName, loc));
          }
        }
      }
    };
  };

  var RESERVED = ['@arguments', '@args', '@block', '@else'];

  var isReserved = void 0,
      assertMessage = void 0;

  if (_features.EMBER_GLIMMER_NAMED_ARGUMENTS) {
    isReserved = function (name) {
      return RESERVED.indexOf(name) !== -1 || name.match(/^@[^a-z]/);
    };
    assertMessage = function (name) {
      return '\'' + name + '\' is reserved.';
    };
  } else {
    isReserved = function (name) {
      return name[0] === '@';
    };
    assertMessage = function (name) {
      return '\'' + name + '\' is not a valid path.';
    };
  }
});
enifed('ember-template-compiler/lib/plugins/deprecate-render-model', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default =

  // Remove after 3.4 once _ENABLE_RENDER_SUPPORT flag is no longer needed.
  function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'deprecate-render-model',

      visitor: {
        MustacheStatement: function (node) {
          if (node.path.original === 'render' && node.params.length > 1) {
            node.params.forEach(function (param) {
              if (param.type !== 'PathExpression') {
                return;
              }

              true && !false && (0, _emberDebug.deprecate)(deprecationMessage(moduleName, node, param), false, {
                id: 'ember-template-compiler.deprecate-render-model',
                until: '3.0.0',
                url: 'https://emberjs.com/deprecations/v2.x#toc_model-param-in-code-render-code-helper'
              });
            });
          }
        }
      }
    };
  };

  function deprecationMessage(moduleName, node, param) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);
    var componentName = node.params[0].original;
    var modelName = param.original;


    return 'Please refactor `' + ('{{render "' + componentName + '" ' + modelName + '}}') + '` to a component and invoke via' + (' `' + ('{{' + componentName + ' model=' + modelName + '}}') + '`. ' + sourceInformation);
  }
});
enifed('ember-template-compiler/lib/plugins/deprecate-render', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default =

  // Remove after 3.4 once _ENABLE_RENDER_SUPPORT flag is no longer needed.
  function (env) {
    var moduleName = env.meta.moduleName;

    return {
      name: 'deprecate-render',

      visitor: {
        MustacheStatement: function (node) {
          if (node.path.original !== 'render') {
            return;
          }
          if (node.params.length !== 1) {
            return;
          }

          each(node.params, function (param) {
            if (param.type !== 'StringLiteral') {
              return;
            }

            true && !false && (0, _emberDebug.deprecate)(deprecationMessage(moduleName, node), false, {
              id: 'ember-template-compiler.deprecate-render',
              until: '3.0.0',
              url: 'https://emberjs.com/deprecations/v2.x#toc_code-render-code-helper'
            });
          });
        }
      }
    };
  };

  function each(list, callback) {
    var i, l;

    for (i = 0, l = list.length; i < l; i++) {
      callback(list[i]);
    }
  }

  function deprecationMessage(moduleName, node) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);
    var componentName = node.params[0].original;


    return 'Please refactor `' + ('{{render "' + componentName + '"}}') + '` to a component and invoke via' + (' `' + ('{{' + componentName + '}}') + '`. ' + sourceInformation);
  }
});
enifed('ember-template-compiler/lib/plugins/index', ['exports', 'ember-template-compiler/lib/plugins/transform-old-binding-syntax', 'ember-template-compiler/lib/plugins/transform-angle-bracket-components', 'ember-template-compiler/lib/plugins/transform-top-level-components', 'ember-template-compiler/lib/plugins/transform-inline-link-to', 'ember-template-compiler/lib/plugins/transform-old-class-binding-syntax', 'ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings', 'ember-template-compiler/lib/plugins/deprecate-render-model', 'ember-template-compiler/lib/plugins/deprecate-render', 'ember-template-compiler/lib/plugins/assert-reserved-named-arguments', 'ember-template-compiler/lib/plugins/transform-action-syntax', 'ember-template-compiler/lib/plugins/transform-input-type-syntax', 'ember-template-compiler/lib/plugins/transform-attrs-into-args', 'ember-template-compiler/lib/plugins/transform-each-in-into-each', 'ember-template-compiler/lib/plugins/transform-has-block-syntax', 'ember-template-compiler/lib/plugins/transform-dot-component-invocation', 'ember-template-compiler/lib/plugins/assert-input-helper-without-block', 'ember-template-compiler/lib/plugins/transform-in-element', 'ember-template-compiler/lib/plugins/assert-if-helper-without-arguments'], function (exports, _transformOldBindingSyntax, _transformAngleBracketComponents, _transformTopLevelComponents, _transformInlineLinkTo, _transformOldClassBindingSyntax, _transformQuotedBindingsIntoJustBindings, _deprecateRenderModel, _deprecateRender, _assertReservedNamedArguments, _transformActionSyntax, _transformInputTypeSyntax, _transformAttrsIntoArgs, _transformEachInIntoEach, _transformHasBlockSyntax, _transformDotComponentInvocation, _assertInputHelperWithoutBlock, _transformInElement, _assertIfHelperWithoutArguments) {
  'use strict';

  var transforms = [_transformDotComponentInvocation.default, _transformOldBindingSyntax.default, _transformAngleBracketComponents.default, _transformTopLevelComponents.default, _transformInlineLinkTo.default, _transformOldClassBindingSyntax.default, _transformQuotedBindingsIntoJustBindings.default, _deprecateRenderModel.default, _deprecateRender.default, _assertReservedNamedArguments.default, _transformActionSyntax.default, _transformInputTypeSyntax.default, _transformAttrsIntoArgs.default, _transformEachInIntoEach.default, _transformHasBlockSyntax.default, _assertInputHelperWithoutBlock.default, _transformInElement.default, _assertIfHelperWithoutArguments.default];

  exports.default = Object.freeze(transforms);
});
enifed('ember-template-compiler/lib/plugins/transform-action-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   <button {{action 'foo'}}>
   <button onblur={{action 'foo'}}>
   <button onblur={{action (action 'foo') 'bar'}}>
    ```
  
    with
  
    ```handlebars
   <button {{action this 'foo'}}>
   <button onblur={{action this 'foo'}}>
   <button onblur={{action this (action this 'foo') 'bar'}}>
    ```
  
    @private
    @class TransformActionSyntax
  */

  function (_ref) {
    var syntax = _ref.syntax;
    var b = syntax.builders;

    return {
      name: 'transform-action-syntax',

      visitor: {
        ElementModifierStatement: function (node) {
          if (isAction(node)) {
            insertThisAsFirstParam(node, b);
          }
        },
        MustacheStatement: function (node) {
          if (isAction(node)) {
            insertThisAsFirstParam(node, b);
          }
        },
        SubExpression: function (node) {
          if (isAction(node)) {
            insertThisAsFirstParam(node, b);
          }
        }
      }
    };
  };

  function isAction(node) {
    return node.path.original === 'action';
  }

  function insertThisAsFirstParam(node, builders) {
    node.params.unshift(builders.path('this'));
  }
});
enifed('ember-template-compiler/lib/plugins/transform-angle-bracket-components', ['exports'], function (exports) {
  'use strict';

  exports.default = function () /* env */{
    return {
      name: 'transform-angle-bracket-components',

      visitor: {
        ComponentNode: function (node) {
          node.tag = '<' + node.tag + '>';
        }
      }
    };
  };
});
enifed('ember-template-compiler/lib/plugins/transform-attrs-into-args', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{attrs.foo.bar}}
    ```
  
    to
  
    ```handlebars
   {{@foo.bar}}
    ```
  
    as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}`,
    `{{this.attrs.foo}}` etc
  
    @private
    @class TransformAttrsToProps
  */

  function (env) {
    var b = env.syntax.builders;

    var stack = [[]];

    return {
      name: 'transform-attrs-into-args',

      visitor: {
        Program: {
          enter: function (node) {
            var parent = stack[stack.length - 1];
            stack.push(parent.concat(node.blockParams));
          },
          exit: function () {
            stack.pop();
          }
        },

        PathExpression: function (node) {
          var path;

          if (isAttrs(node, stack[stack.length - 1])) {
            path = b.path(node.original.substr(6));

            path.original = '@' + path.original;
            path.data = true;
            return path;
          }
        }
      }
    };
  };

  function isAttrs(node, symbols) {
    var name = node.parts[0];

    if (symbols.indexOf(name) !== -1) {
      return false;
    }

    if (name === 'attrs') {
      if (node.this === true) {
        node.parts.shift();
        node.original = node.original.slice(5);
      }

      return true;
    }

    return false;
  }
});
enifed('ember-template-compiler/lib/plugins/transform-dot-component-invocation', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
    Transforms dot invocation of closure components to be wrapped
    with the component helper. This allows for a more static invocation
    of the component.
  
    ```handlebars
   {{#my-component as |comps|}}
    {{comp.dropdown isOpen=false}}
   {{/my-component}}
    ```
  
    with
  
    ```handlebars
    {{#my-component as |comps|}}
      {{component comp.dropdown isOpen=false}}
    {{/my-component}}
    ```
    and
  
    ```handlebars
   {{#my-component as |comps|}}
    {{comp.dropdown isOpen}}
   {{/my-component}}
    ```
  
    with
  
    ```handlebars
    {{#my-component as |comps|}}
      {{component comp.dropdown isOpen}}
    {{/my-component}}
    ```
  
    and
  
    ```handlebars
    {{#my-component as |comps|}}
      {{#comp.dropdown}}Open{{/comp.dropdown}}
    {{/my-component}}
    ```
  
    with
  
    ```handlebars
    {{#my-component as |comps|}}
      {{#component comp.dropdown}}Open{{/component}}
    {{/my-component}}
    ```
  
    @private
    @class TransFormDotComponentInvocation
  */
  function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-dot-component-invocation',

      visitor: {
        MustacheStatement: function (node) {
          if (isInlineInvocation(node.path, node.params, node.hash)) {
            wrapInComponent(node, b);
          }
        },
        BlockStatement: function (node) {
          if (isMultipartPath(node.path)) {
            wrapInComponent(node, b);
          }
        }
      }
    };
  };

  function isMultipartPath(path) {
    return path.parts && path.parts.length > 1;
  }

  function isInlineInvocation(path, params, hash) {
    if (isMultipartPath(path)) {
      if (params.length > 0 || hash.pairs.length > 0) {
        return true;
      }
    }

    return false;
  }

  function wrapInComponent(node, builder) {
    var component = node.path;
    var componentHelper = builder.path('component');
    node.path = componentHelper;
    node.params.unshift(component);
  }
});
enifed('ember-template-compiler/lib/plugins/transform-each-in-into-each', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{#each-in iterableThing as |key value|}}
    ```
  
    with
  
    ```handlebars
   {{#each (-each-in iterableThing) as |value key|}}
    ```
  
    @private
    @class TransformHasBlockSyntax
  */
  function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-each-in-into-each',

      visitor: {
        BlockStatement: function (node) {
          var blockParams, key, value;

          if (node.path.original === 'each-in') {
            node.params[0] = b.sexpr(b.path('-each-in'), [node.params[0]]);

            blockParams = node.program.blockParams;


            if (!blockParams || blockParams.length === 0) {
              // who uses {{#each-in}} without block params?!
            } else if (blockParams.length === 1) {
              // insert a dummy variable for the first slot
              // pick a name that won't parse so it won't shadow any real variables
              blockParams = ['( unused value )', blockParams[0]];
            } else {
              key = blockParams.shift();
              value = blockParams.shift();

              blockParams = [value, key].concat(blockParams);
            }

            node.program.blockParams = blockParams;

            return b.block(b.path('each'), node.params, node.hash, node.program, node.inverse, node.loc);
          }
        }
      }
    };
  };
});
enifed('ember-template-compiler/lib/plugins/transform-has-block-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-has-block-syntax',

      visitor: {
        PathExpression: function (node) {
          if (TRANSFORMATIONS[node.original]) {
            return b.sexpr(b.path(TRANSFORMATIONS[node.original]));
          }
        },
        MustacheStatement: function (node) {
          if (TRANSFORMATIONS[node.path.original]) {
            return b.mustache(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash, null, node.loc);
          }
        },
        SubExpression: function (node) {
          if (TRANSFORMATIONS[node.path.original]) {
            return b.sexpr(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash);
          }
        }
      }
    };
  };
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{hasBlock}}
    ```
  
    with
  
    ```handlebars
   {{has-block}}
    ```
  
    @private
    @class TransformHasBlockSyntax
  */

  var TRANSFORMATIONS = {
    hasBlock: 'has-block',
    hasBlockParams: 'has-block-params'
  };
});
enifed('ember-template-compiler/lib/plugins/transform-in-element', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default =

  /**
   @module ember
  */

  /**
    glimmer-vm has made the `in-element` API public from its perspective (in
    https://github.com/glimmerjs/glimmer-vm/pull/619) so in glimmer-vm the
    correct keyword to use is `in-element`, however Ember is still working through
    its form of `in-element` (see https://github.com/emberjs/rfcs/pull/287).
  
    There are enough usages of the pre-existing private API (`{{-in-element`) in
    the wild that we need to transform `{{-in-element` into `{{in-element` during
    template transpilation, but since RFC#287 is not landed and enabled by default we _also_ need
    to prevent folks from starting to use `{{in-element` "for realz".
  
  
    Tranforms:
  
    ```handlebars
    {{#-in-element someElement}}
      {{modal-display text=text}}
    {{/-in-element}}
    ```
  
    into:
  
    ```handlebars
    {{#in-element someElement}}
      {{modal-display text=text}}
    {{/in-element}}
    ```
  
    And issues a build time assertion for:
  
    ```handlebars
    {{#in-element someElement}}
      {{modal-display text=text}}
    {{/in-element}}
    ```
  
    @private
    @class TransformHasBlockSyntax
  */
  function (env) {
    var moduleName = env.meta.moduleName;
    var b = env.syntax.builders;

    var cursorCount = 0;

    return {
      name: 'transform-in-element',

      visitor: {
        BlockStatement: function (node) {
          var hasNextSibling, hash, guid, guidPair, nullLiteral, nextSibling;

          if (node.path.original === 'in-element') {
            true && !false && (0, _emberDebug.assert)(assertMessage(moduleName, node));
          } else if (node.path.original === '-in-element') {
            node.path.original = 'in-element';
            node.path.parts = ['in-element'];

            // replicate special hash arguments added here:
            // https://github.com/glimmerjs/glimmer-vm/blob/ba9b37d44b85fa1385eeeea71910ff5798198c8e/packages/%40glimmer/syntax/lib/parser/handlebars-node-visitors.ts#L340-L363
            hasNextSibling = false;
            hash = node.hash;

            hash.pairs.forEach(function (pair) {
              if (pair.key === 'nextSibling') {
                hasNextSibling = true;
              }
            });

            guid = b.literal('StringLiteral', '%cursor:' + cursorCount++ + '%');
            guidPair = b.pair('guid', guid);

            hash.pairs.unshift(guidPair);

            if (!hasNextSibling) {
              nullLiteral = b.literal('NullLiteral', null);
              nextSibling = b.pair('nextSibling', nullLiteral);

              hash.pairs.push(nextSibling);
            }
          }
        }
      }
    };
  };

  function assertMessage(moduleName, node) {
    var sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, node.loc);

    return 'The {{in-element}} helper cannot be used. ' + sourceInformation;
  }
});
enifed('ember-template-compiler/lib/plugins/transform-inline-link-to', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-inline-link-to',

      visitor: {
        MustacheStatement: function (node) {
          var content;

          if (node.path.original === 'link-to') {
            content = node.escaped ? node.params[0] : unsafeHtml(b, node.params[0]);

            return b.block('link-to', node.params.slice(1), node.hash, buildProgram(b, content, node.loc), null, node.loc);
          }
        }
      }
    };
  };
  function buildProgram(b, content, loc) {
    return b.program([buildStatement(b, content, loc)], null, loc);
  }

  function buildStatement(b, content, loc) {
    switch (content.type) {
      case 'PathExpression':
        return b.mustache(content, null, null, null, loc);

      case 'SubExpression':
        return b.mustache(content.path, content.params, content.hash, null, loc);

      // The default case handles literals.
      default:
        return b.text('' + content.value, loc);
    }
  }

  function unsafeHtml(b, expr) {
    return b.sexpr('-html-safe', [expr]);
  }
});
enifed('ember-template-compiler/lib/plugins/transform-input-type-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default =
  /**
   @module ember
  */

  /**
    A Glimmer2 AST transformation that replaces all instances of
  
    ```handlebars
   {{input type=boundType}}
    ```
  
    with
  
    ```handlebars
   {{input (-input-type boundType) type=boundType}}
    ```
  
    Note that the type parameters is not removed as the -input-type helpers
    is only used to select the component class. The component still needs
    the type parameter to function.
  
    @private
    @class TransformInputTypeSyntax
  */

  function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-input-type-syntax',

      visitor: {
        MustacheStatement: function (node) {
          if (isInput(node)) {
            insertTypeHelperParameter(node, b);
          }
        }
      }
    };
  };

  function isInput(node) {
    return node.path.original === 'input';
  }

  function insertTypeHelperParameter(node, builders) {
    var pairs = node.hash.pairs,
        i;
    var pair = null;
    for (i = 0; i < pairs.length; i++) {
      if (pairs[i].key === 'type') {
        pair = pairs[i];
        break;
      }
    }
    if (pair && pair.value.type !== 'StringLiteral') {
      node.params.unshift(builders.sexpr('-input-type', [pair.value], null, pair.loc));
    }
  }
});
enifed('ember-template-compiler/lib/plugins/transform-old-binding-syntax', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/calculate-location-display'], function (exports, _emberDebug, _calculateLocationDisplay) {
  'use strict';

  exports.default = function (env) {
    var moduleName = env.meta.moduleName;

    var b = env.syntax.builders;

    return {
      name: 'transform-old-binding-syntax',

      visitor: {
        BlockStatement: function (node) {
          processHash(b, node, moduleName);
        },
        MustacheStatement: function (node) {
          processHash(b, node, moduleName);
        }
      }
    };
  };


  function processHash(b, node, moduleName) {
    var i, pair, key, value, sourceInformation, newKey;

    for (i = 0; i < node.hash.pairs.length; i++) {
      pair = node.hash.pairs[i];
      key = pair.key, value = pair.value;
      sourceInformation = (0, _calculateLocationDisplay.default)(moduleName, pair.loc);


      if (key === 'classBinding') {
        return;
      }

      true && !(key !== 'attributeBindings') && (0, _emberDebug.assert)('Setting \'attributeBindings\' via template helpers is not allowed ' + sourceInformation, key !== 'attributeBindings');

      if (key.substr(-7) === 'Binding') {
        newKey = key.slice(0, -7);


        true && !false && (0, _emberDebug.deprecate)('You\'re using legacy binding syntax: ' + key + '=' + exprToString(value) + ' ' + sourceInformation + '. Please replace with ' + newKey + '=' + value.original, false, {
          id: 'ember-template-compiler.transform-old-binding-syntax',
          until: '3.0.0'
        });

        pair.key = newKey;
        if (value.type === 'StringLiteral') {
          pair.value = b.path(value.original);
        }
      }
    }
  }

  function exprToString(expr) {
    switch (expr.type) {
      case 'StringLiteral':
        return '"' + expr.original + '"';
      case 'PathExpression':
        return expr.original;
    }
  }
});
enifed('ember-template-compiler/lib/plugins/transform-old-class-binding-syntax', ['exports'], function (exports) {
  'use strict';

  exports.default = function (env) {
    var b = env.syntax.builders;

    return {
      name: 'transform-old-class-binding-syntax',

      visitor: {
        MustacheStatement: function (node) {
          process(b, node);
        },
        BlockStatement: function (node) {
          process(b, node);
        }
      }
    };
  };


  function process(b, node) {
    var allOfTheMicrosyntaxes = [];
    var allOfTheMicrosyntaxIndexes = [];
    var classPair = void 0;

    each(node.hash.pairs, function (pair, index) {
      var key = pair.key;

      if (key === 'classBinding' || key === 'classNameBindings') {
        allOfTheMicrosyntaxIndexes.push(index);
        allOfTheMicrosyntaxes.push(pair);
      } else if (key === 'class') {
        classPair = pair;
      }
    });

    if (allOfTheMicrosyntaxes.length === 0) {
      return;
    }

    var classValue = [];

    if (classPair) {
      classValue.push(classPair.value);
      classValue.push(b.string(' '));
    } else {
      classPair = b.pair('class', null);
      node.hash.pairs.push(classPair);
    }

    each(allOfTheMicrosyntaxIndexes, function (index) {
      node.hash.pairs.splice(index, 1);
    });

    each(allOfTheMicrosyntaxes, function (_ref) {
      var value = _ref.value,
          microsyntax;

      var sexprs = [];
      // TODO: add helpful deprecation when both `classNames` and `classNameBindings` can
      // be removed.

      if (value.type === 'StringLiteral') {
        microsyntax = parseMicrosyntax(value.original);


        buildSexprs(microsyntax, sexprs, b);

        classValue.push.apply(classValue, sexprs);
      }
    });

    var hash = b.hash();
    classPair.value = b.sexpr(b.path('concat'), classValue, hash);
  }

  function buildSexprs(microsyntax, sexprs, b) {
    var i, _microsyntax$i, propName, activeClass, inactiveClass, sexpr, params, sexprParams, hash;

    for (i = 0; i < microsyntax.length; i++) {
      _microsyntax$i = microsyntax[i], propName = _microsyntax$i[0], activeClass = _microsyntax$i[1], inactiveClass = _microsyntax$i[2];
      sexpr = void 0;

      // :my-class-name microsyntax for static values

      if (propName === '') {
        sexpr = b.string(activeClass);
      } else {
        params = [b.path(propName)];


        if (activeClass || activeClass === '') {
          params.push(b.string(activeClass));
        } else {
          sexprParams = [b.string(propName), b.path(propName)];
          hash = b.hash();

          if (activeClass !== undefined) {
            hash.pairs.push(b.pair('activeClass', b.string(activeClass)));
          }

          if (inactiveClass !== undefined) {
            hash.pairs.push(b.pair('inactiveClass', b.string(inactiveClass)));
          }

          params.push(b.sexpr(b.path('-normalize-class'), sexprParams, hash));
        }

        if (inactiveClass || inactiveClass === '') {
          params.push(b.string(inactiveClass));
        }

        sexpr = b.sexpr(b.path('if'), params);
      }

      sexprs.push(sexpr);
      sexprs.push(b.string(' '));
    }
  }

  function each(list, callback) {
    var i;

    for (i = 0; i < list.length; i++) {
      callback(list[i], i);
    }
  }

  function parseMicrosyntax(string) {
    var segments = string.split(' '),
        i;

    for (i = 0; i < segments.length; i++) {
      segments[i] = segments[i].split(':');
    }

    return segments;
  }
});
enifed('ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings', ['exports'], function (exports) {
  'use strict';

  exports.default = function () /* env */{
    return {
      name: 'transform-quoted-bindings-into-just-bindings',

      visitor: {
        ElementNode: function (node) {
          var styleAttr = getStyleAttr(node);

          if (!validStyleAttr(styleAttr)) {
            return;
          }

          styleAttr.value = styleAttr.value.parts[0];
        }
      }
    };
  };


  function validStyleAttr(attr) {
    if (!attr) {
      return false;
    }

    var value = attr.value;

    if (!value || value.type !== 'ConcatStatement' || value.parts.length !== 1) {
      return false;
    }

    var onlyPart = value.parts[0];

    return onlyPart.type === 'MustacheStatement';
  }

  function getStyleAttr(node) {
    var attributes = node.attributes,
        i;

    for (i = 0; i < attributes.length; i++) {
      if (attributes[i].name === 'style') {
        return attributes[i];
      }
    }
  }
});
enifed('ember-template-compiler/lib/plugins/transform-top-level-components', ['exports'], function (exports) {
  'use strict';

  exports.default = function () /* env */{
    return {
      name: 'transform-top-level-component',

      visitor: {
        Program: function (node) {
          hasSingleComponentNode(node, function (component) {
            component.tag = '@' + component.tag;
            component.isStatic = true;
          });
        }
      }
    };
  };


  function hasSingleComponentNode(program, componentCallback) {
    var loc = program.loc,
        body = program.body,
        i,
        curr;

    if (!loc || loc.start.line !== 1 || loc.start.column !== 0) {
      return;
    }

    var lastComponentNode = void 0;
    var nodeCount = 0;

    for (i = 0; i < body.length; i++) {
      curr = body[i];

      // text node with whitespace only

      if (curr.type === 'TextNode' && /^[\s]*$/.test(curr.chars)) {
        continue;
      }

      // has multiple root elements if we've been here before
      if (nodeCount++ > 0) {
        return false;
      }

      if (curr.type === 'ComponentNode' || curr.type === 'ElementNode') {
        lastComponentNode = curr;
      }
    }

    if (!lastComponentNode) {
      return;
    }

    if (lastComponentNode.type === 'ComponentNode') {
      componentCallback(lastComponentNode);
    }
  }
});
enifed('ember-template-compiler/lib/system/bootstrap', ['exports', 'ember-debug', 'ember-template-compiler/lib/system/compile'], function (exports, _emberDebug, _compile) {
  'use strict';

  /**
    Find templates stored in the head tag as script tags and make them available
    to `Ember.CoreView` in the global `Ember.TEMPLATES` object.
  
    Script tags with `text/x-handlebars` will be compiled
    with Ember's template compiler and are suitable for use as a view's template.
  
    @private
    @method bootstrap
    @for Ember.HTMLBars
    @static
    @param ctx
  */
  /**
  @module ember
  */

  exports.default = function (_ref) {
    var context = _ref.context,
        hasTemplate = _ref.hasTemplate,
        setTemplate = _ref.setTemplate,
        i,
        script,
        templateName,
        template;

    if (!context) {
      context = document;
    }

    var elements = context.querySelectorAll('script[type="text/x-handlebars"]');

    for (i = 0; i < elements.length; i++) {
      script = elements[i];

      // Get the name of the script
      // First look for data-template-name attribute, then fall back to its
      // id if no name is found.

      templateName = script.getAttribute('data-template-name') || script.getAttribute('id') || 'application';
      template = void 0;


      template = (0, _compile.default)(script.innerHTML, {
        moduleName: templateName
      });

      // Check if template of same name already exists.
      if (hasTemplate(templateName)) {
        throw new _emberDebug.Error('Template named "' + templateName + '" already exists.');
      }

      // For templates which have a name, we save them and then remove them from the DOM.
      setTemplate(templateName, template);

      // Remove script tag from DOM.
      script.parentNode.removeChild(script);
    }
  };
});
enifed('ember-template-compiler/lib/system/calculate-location-display', ['exports'], function (exports) {
  'use strict';

  exports.default = function (moduleName) {
    var loc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var _ref = loc.start || {},
        column = _ref.column,
        line = _ref.line;

    var moduleInfo = '';
    if (moduleName) {
      moduleInfo += '\'' + moduleName + '\' ';
    }

    if (line !== undefined && column !== undefined) {
      if (moduleName) {
        // only prepend @ if the moduleName was present
        moduleInfo += '@ ';
      }
      moduleInfo += 'L' + line + ':C' + column;
    }

    if (moduleInfo) {
      moduleInfo = '(' + moduleInfo + ') ';
    }

    return moduleInfo;
  };
});
enifed('ember-template-compiler/lib/system/compile-options', ['exports', 'ember-utils', 'ember-template-compiler/lib/plugins/index'], function (exports, _emberUtils, _index) {
  'use strict';

  exports.default = compileOptions;
  exports.registerPlugin = registerPlugin;
  exports.unregisterPlugin = unregisterPlugin;

  var USER_PLUGINS = [];

  function compileOptions(_options) {
    var options = (0, _emberUtils.assign)({ meta: {} }, _options),
        meta,
        potententialPugins,
        providedPlugins,
        pluginsToAdd;

    // move `moduleName` into `meta` property
    if (options.moduleName) {
      meta = options.meta;

      meta.moduleName = options.moduleName;
    }

    if (!options.plugins) {
      options.plugins = { ast: [].concat(USER_PLUGINS, _index.default) };
    } else {
      potententialPugins = [].concat(USER_PLUGINS, _index.default);
      providedPlugins = options.plugins.ast.map(function (plugin) {
        return wrapLegacyPluginIfNeeded(plugin);
      });
      pluginsToAdd = potententialPugins.filter(function (plugin) {
        return options.plugins.ast.indexOf(plugin) === -1;
      });

      options.plugins.ast = providedPlugins.concat(pluginsToAdd);
    }

    return options;
  }

  function wrapLegacyPluginIfNeeded(_plugin) {
    var plugin = _plugin;
    if (_plugin.prototype && _plugin.prototype.transform) {
      plugin = function (env) {
        var pluginInstantiated = false;

        return {
          name: _plugin.constructor && _plugin.constructor.name,

          visitor: {
            Program: function (node) {
              var _plugin2;

              if (!pluginInstantiated) {
                pluginInstantiated = true;
                _plugin2 = new _plugin(env);


                _plugin2.syntax = env.syntax;

                return _plugin2.transform(node);
              }
            }
          }
        };
      };

      plugin.__raw = _plugin;
    }

    return plugin;
  }

  function registerPlugin(type, _plugin) {
    if (type !== 'ast') {
      throw new Error('Attempting to register ' + _plugin + ' as "' + type + '" which is not a valid Glimmer plugin type.');
    }

    for (i = 0; i < USER_PLUGINS.length; i++) {
      PLUGIN = USER_PLUGINS[i];

      if (PLUGIN === _plugin || PLUGIN.__raw === _plugin) {
        return;
      }
    }

    var plugin = wrapLegacyPluginIfNeeded(_plugin),
        i,
        PLUGIN;

    USER_PLUGINS = [plugin].concat(USER_PLUGINS);
  }

  function unregisterPlugin(type, PluginClass) {
    if (type !== 'ast') {
      throw new Error('Attempting to unregister ' + PluginClass + ' as "' + type + '" which is not a valid Glimmer plugin type.');
    }

    USER_PLUGINS = USER_PLUGINS.filter(function (plugin) {
      return plugin !== PluginClass && plugin.__raw !== PluginClass;
    });
  }
});
enifed('ember-template-compiler/lib/system/compile', ['exports', 'require', 'ember-template-compiler/lib/system/precompile'], function (exports, _require2, _precompile) {
  'use strict';

  exports.default = compile;
  /**
  @module ember
  */
  var template = void 0;

  /**
    Uses HTMLBars `compile` function to process a string into a compiled template.
  
    This is not present in production builds.
  
    @private
    @method compile
    @param {String} templateString This is the string to be compiled by HTMLBars.
    @param {Object} options This is an options hash to augment the compiler options.
  */
  function compile(templateString, options) {
    if (!template && (0, _require2.has)('ember-glimmer')) {
      template = (0, _require2.default)('ember-glimmer').template;
    }

    if (!template) {
      throw new Error('Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.');
    }

    var precompiledTemplateString = (0, _precompile.default)(templateString, options);
    var templateJS = new Function('return ' + precompiledTemplateString)();
    return template(templateJS);
  }
});
enifed('ember-template-compiler/lib/system/initializer', ['require', 'ember-template-compiler/lib/system/bootstrap'], function (_require2, _bootstrap) {
  'use strict';

  // Globals mode template compiler

  var emberEnv, emberGlimmer, emberApp, Application, hasTemplate, setTemplate, environment;
  if ((0, _require2.has)('ember-application') && (0, _require2.has)('ember-environment') && (0, _require2.has)('ember-glimmer')) {
    emberEnv = (0, _require2.default)('ember-environment');
    emberGlimmer = (0, _require2.default)('ember-glimmer');
    emberApp = (0, _require2.default)('ember-application');
    Application = emberApp.Application;
    hasTemplate = emberGlimmer.hasTemplate, setTemplate = emberGlimmer.setTemplate;
    environment = emberEnv.environment;


    Application.initializer({
      name: 'domTemplates',
      initialize: function () {
        var context = void 0;
        if (environment.hasDOM) {
          context = document;
        }

        (0, _bootstrap.default)({ context: context, hasTemplate: hasTemplate, setTemplate: setTemplate });
      }
    });
  }
});
enifed('ember-template-compiler/lib/system/precompile', ['exports', 'ember-template-compiler/lib/system/compile-options', '@glimmer/compiler'], function (exports, _compileOptions, _compiler) {
  'use strict';

  exports.default =

  /**
    Uses HTMLBars `compile` function to process a string into a compiled template string.
    The returned string must be passed through `Ember.HTMLBars.template`.
  
    This is not present in production builds.
  
    @private
    @method precompile
    @param {String} templateString This is the string to be compiled by HTMLBars.
  */
  /**
  @module ember
  */

  function (templateString, options) {
    return (0, _compiler.precompile)(templateString, (0, _compileOptions.default)(options));
  };
});
enifed('ember-utils', ['exports'], function (exports) {
  'use strict';

  exports.setProxy = exports.isProxy = exports.WeakSet = exports.HAS_NATIVE_PROXY = exports.HAS_NATIVE_SYMBOL = exports.toString = exports.setName = exports.getName = exports.makeArray = exports.tryInvoke = exports.canInvoke = exports.lookupDescriptor = exports.inspect = exports.wrap = exports.ROOT = exports.checkHasSuper = exports.intern = exports.guidFor = exports.generateGuid = exports.GUID_KEY = exports.uuid = exports.dictionary = exports.assignPolyfill = exports.assign = exports.OWNER = exports.setOwner = exports.getOwner = exports.isInternalSymbol = exports.symbol = exports.NAME_KEY = undefined;
  /**
    Strongly hint runtimes to intern the provided string.
  
    When do I need to use this function?
  
    For the most part, never. Pre-mature optimization is bad, and often the
    runtime does exactly what you need it to, and more often the trade-off isn't
    worth it.
  
    Why?
  
    Runtimes store strings in at least 2 different representations:
    Ropes and Symbols (interned strings). The Rope provides a memory efficient
    data-structure for strings created from concatenation or some other string
    manipulation like splitting.
  
    Unfortunately checking equality of different ropes can be quite costly as
    runtimes must resort to clever string comparison algorithms. These
    algorithms typically cost in proportion to the length of the string.
    Luckily, this is where the Symbols (interned strings) shine. As Symbols are
    unique by their string content, equality checks can be done by pointer
    comparison.
  
    How do I know if my string is a rope or symbol?
  
    Typically (warning general sweeping statement, but truthy in runtimes at
    present) static strings created as part of the JS source are interned.
    Strings often used for comparisons can be interned at runtime if some
    criteria are met.  One of these criteria can be the size of the entire rope.
    For example, in chrome 38 a rope longer then 12 characters will not
    intern, nor will segments of that rope.
  
    Some numbers: http://jsperf.com/eval-vs-keys/8
  
    Known Trick™
  
    @private
    @return {String} interned version of the provided string
  */
  function intern(str) {
    var obj = {};
    obj[str] = 1;
    for (var key in obj) {
      if (key === str) {
        return key;
      }
    }
    return str;
  }

  /**
    Returns whether Type(value) is Object.
  
    Useful for checking whether a value is a valid WeakMap key.
  
    Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
          https://tc39.github.io/ecma262/#sec-weakmap.prototype.set
  
    @private
    @function isObject
  */
  function isObject(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
  }

  /**
   @module @ember/object
  */

  /**
   Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
   jQuery master. We'll just bootstrap our own uuid now.
  
   @private
   @return {Number} the uuid
   */
  var _uuid = 0;

  /**
   Generates a universally unique identifier. This method
   is used internally by Ember for assisting with
   the generation of GUID's and other unique identifiers.
  
   @public
   @return {Number} [description]
   */
  function uuid() {
    return ++_uuid;
  }

  /**
   Prefix used for guids through out Ember.
   @private
   @property GUID_PREFIX
   @for Ember
   @type String
   @final
   */
  var GUID_PREFIX = 'ember';

  // Used for guid generation...
  var OBJECT_GUIDS = new WeakMap();
  var NON_OBJECT_GUIDS = new Map();
  /**
    A unique key used to assign guids and other private metadata to objects.
    If you inspect an object in your browser debugger you will often see these.
    They can be safely ignored.
  
    On browsers that support it, these properties are added with enumeration
    disabled so they won't show up when you iterate over your properties.
  
    @private
    @property GUID_KEY
    @for Ember
    @type String
    @final
  */
  var GUID_KEY = intern('__ember' + +new Date());

  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in. You will rarely need to use this method. Instead you should
    call `guidFor(obj)`, which return an existing guid if available.
  
    @private
    @method generateGuid
    @static
    @for @ember/object/internals
    @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
      be saved on the object and reused whenever you pass the same object
      again.
  
      If no object is passed, just generate a new guid.
    @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
      separate the guid into separate namespaces.
    @return {String} the guid
  */


  /**
    Returns a unique id for the object. If the object does not yet have a guid,
    one will be assigned to it. You can call this on any object,
    `EmberObject`-based or not.
  
    You can also use this method on DOM Element objects.
  
    @public
    @static
    @method guidFor
    @for @ember/object/internals
    @param {Object} obj any object, string, number, Element, or primitive
    @return {String} the unique guid for this instance.
  */


  var GENERATED_SYMBOLS = [];

  function symbol(debugName) {
    // TODO: Investigate using platform symbols, but we do not
    // want to require non-enumerability for this API, which
    // would introduce a large cost.
    var id = GUID_KEY + Math.floor(Math.random() * new Date());
    var symbol = intern('__' + debugName + id + '__');
    GENERATED_SYMBOLS.push(symbol);
    return symbol;
  }

  /**
  @module @ember/application
  */

  var OWNER = symbol('OWNER');

  /**
    Framework objects in an Ember application (components, services, routes, etc.)
    are created via a factory and dependency injection system. Each of these
    objects is the responsibility of an "owner", which handled its
    instantiation and manages its lifetime.
  
    `getOwner` fetches the owner object responsible for an instance. This can
    be used to lookup or resolve other class instances, or register new factories
    into the owner.
  
    For example, this component dynamically looks up a service based on the
    `audioType` passed as an attribute:
  
    ```app/components/play-audio.js
    import Component from '@ember/component';
    import { computed } from '@ember/object';
    import { getOwner } from '@ember/application';
  
    // Usage:
    //
    //   {{play-audio audioType=model.audioType audioFile=model.file}}
    //
    export default Component.extend({
      audioService: computed('audioType', function() {
        let owner = getOwner(this);
        return owner.lookup(`service:${this.get('audioType')}`);
      }),
  
      click() {
        let player = this.get('audioService');
        player.play(this.get('audioFile'));
      }
    });
    ```
  
    @method getOwner
    @static
    @for @ember/application
    @param {Object} object An object with an owner.
    @return {Object} An owner object.
    @since 2.3.0
    @public
  */


  /**
    `setOwner` forces a new owner on a given object instance. This is primarily
    useful in some testing cases.
  
    @method setOwner
    @static
    @for @ember/application
    @param {Object} object An object instance.
    @param {Object} object The new owner object of the object instance.
    @since 2.3.0
    @public
  */


  /**
   @module @ember/polyfills
  */
  /**
    Copy properties from a source object to a target object.
  
    ```javascript
    import { assign } from '@ember/polyfills';
  
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    var c = { company: 'Tilde Inc.' };
    assign(a, b, c); // a === { first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.' }, b === { last: 'Katz' }, c === { company: 'Tilde Inc.' }
    ```
  
    @method assign
    @for @ember/polyfills
    @param {Object} original The object to assign into
    @param {Object} ...args The objects to copy properties from
    @return {Object}
    @public
    @static
  */
  function assign(original) {
    var i, arg, updates, _i, prop;

    for (i = 1; i < arguments.length; i++) {
      arg = arguments[i];

      if (!arg) {
        continue;
      }

      updates = Object.keys(arg);


      for (_i = 0; _i < updates.length; _i++) {
        prop = updates[_i];

        original[prop] = arg[prop];
      }
    }

    return original;
  }

  // Note: We use the bracket notation so
  //       that the babel plugin does not
  //       transform it.
  // https://www.npmjs.com/package/babel-plugin-transform-object-assign
  var _assign = Object.assign;

  // the delete is meant to hint at runtimes that this object should remain in
  // dictionary mode. This is clearly a runtime specific hack, but currently it
  // appears worthwhile in some usecases. Please note, these deletes do increase
  // the cost of creation dramatically over a plain Object.create. And as this
  // only makes sense for long-lived dictionaries that aren't instantiated often.
  var HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
  var fnToString = Function.prototype.toString;

  var checkHasSuper = function () {
    var sourceAvailable = fnToString.call(function () {
      return this;
    }).indexOf('return this') > -1;

    if (sourceAvailable) {
      return function (func) {
        return HAS_SUPER_PATTERN.test(fnToString.call(func));
      };
    }

    return function () {
      return true;
    };
  }();

  function ROOT() {}
  ROOT.__hasSuper = false;

  function hasSuper(func) {
    if (func.__hasSuper === undefined) {
      func.__hasSuper = checkHasSuper(func);
    }
    return func.__hasSuper;
  }

  /**
    Wraps the passed function so that `this._super` will point to the superFunc
    when the function is invoked. This is the primitive we use to implement
    calls to super.
  
    @private
    @method wrap
    @for Ember
    @param {Function} func The function to call
    @param {Function} superFunc The super function.
    @return {Function} wrapped function.
  */


  function _wrap(func, superFunc) {
    function superWrapper() {
      var orig = this._super;
      this._super = superFunc;
      var ret = func.apply(this, arguments);
      this._super = orig;
      return ret;
    }

    superWrapper.wrappedFunction = func;
    superWrapper.__ember_observes__ = func.__ember_observes__;
    superWrapper.__ember_listens__ = func.__ember_listens__;

    return superWrapper;
  }

  var objectToString = Object.prototype.toString;
  /**
   @module @ember/debug
  */
  /**
    Convenience method to inspect an object. This method will attempt to
    convert the object into a useful string description.
  
    It is a pretty simple implementation. If you want something more robust,
    use something like JSDump: https://github.com/NV/jsDump
  
    @method inspect
    @static
    @param {Object} obj The object you want to inspect.
    @return {String} A description of the object
    @since 1.4.0
    @private
  */


  /**
    Checks to see if the `methodName` exists on the `obj`.
  
    ```javascript
    let foo = { bar: function() { return 'bar'; }, baz: null };
  
    Ember.canInvoke(foo, 'bar'); // true
    Ember.canInvoke(foo, 'baz'); // false
    Ember.canInvoke(foo, 'bat'); // false
    ```
  
    @method canInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @return {Boolean}
    @private
  */
  function canInvoke(obj, methodName) {
    return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
  }

  /**
    @module @ember/utils
  */

  /**
    Checks to see if the `methodName` exists on the `obj`,
    and if it does, invokes it with the arguments passed.
  
    ```javascript
    import { tryInvoke } from '@ember/utils';
  
    let d = new Date('03/15/2013');
  
    tryInvoke(d, 'getTime');              // 1363320000000
    tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
    tryInvoke(d, 'noSuchMethod', [2014]); // undefined
    ```
  
    @method tryInvoke
    @for @ember/utils
    @static
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @param {Array} [args] The arguments to pass to the method
    @return {*} the return value of the invoked method or undefined if it cannot be invoked
    @public
  */


  var isArray = Array.isArray;

  /**
   @module @ember/array
  */
  /**
   Forces the passed object to be part of an array. If the object is already
   an array, it will return the object. Otherwise, it will add the object to
   an array. If object is `null` or `undefined`, it will return an empty array.
  
   ```javascript
   import { makeArray } from '@ember/array';
   import ArrayProxy from '@ember/array/proxy';
  
   makeArray();            // []
   makeArray(null);        // []
   makeArray(undefined);   // []
   makeArray('lindsay');   // ['lindsay']
   makeArray([1, 2, 42]);  // [1, 2, 42]
  
   let proxy = ArrayProxy.create({ content: [] });
  
   makeArray(proxy) === proxy;  // false
   ```
  
   @method makeArray
   @static
   @for @ember/array
   @param {Object} obj the object
   @return {Array}
   @private
   */


  var NAMES = new WeakMap();

  var objectToString$1 = Object.prototype.toString;

  function isNone(obj) {
    return obj === null || obj === undefined;
  }

  /*
   A `toString` util function that supports objects without a `toString`
   method, e.g. an object created with `Object.create(null)`.
  */
  function toString(obj) {
    var len, r, k;

    if (typeof obj === 'string') {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Reimplement Array.prototype.join according to spec (22.1.3.13)
      // Changing ToString(element) with this safe version of ToString.
      len = obj.length;
      r = '';


      for (k = 0; k < len; k++) {
        if (k > 0) {
          r += ',';
        }

        if (!isNone(obj[k])) {
          r += toString(obj[k]);
        }
      }

      return r;
    } else if (obj != null && typeof obj.toString === 'function') {
      return obj.toString();
    } else {
      return objectToString$1.call(obj);
    }
  }

  var HAS_NATIVE_SYMBOL = function () {
    if (typeof Symbol !== 'function') {
      return false;
    }

    // use `Object`'s `.toString` directly to prevent us from detecting
    // polyfills as native
    return Object.prototype.toString.call(Symbol()) === '[object Symbol]';
  }();

  var HAS_NATIVE_PROXY = typeof Proxy === 'function';

  /* globals WeakSet */
  var WeakSet$1 = typeof WeakSet === 'function' ? WeakSet : function () {
    function WeakSetPolyFill() {

      this._map = new WeakMap();
    }

    WeakSetPolyFill.prototype.add = function (val) {
      this._map.set(val, true);
      return this;
    };

    WeakSetPolyFill.prototype.delete = function (val) {
      return this._map.delete(val);
    };

    WeakSetPolyFill.prototype.has = function (val) {
      return this._map.has(val);
    };

    return WeakSetPolyFill;
  }();

  var PROXIES = new WeakSet$1();

  /*
   This package will be eagerly parsed and should have no dependencies on external
   packages.
  
   It is intended to be used to share utility methods that will be needed
   by every Ember application (and is **not** a dumping ground of useful utilities).
  
   Utility methods that are needed in < 80% of cases should be placed
   elsewhere (so they can be lazily evaluated / parsed).
  */
  var NAME_KEY = symbol('NAME_KEY');

  exports.NAME_KEY = NAME_KEY;
  exports.symbol = symbol;
  exports.isInternalSymbol = function (possibleSymbol) {
    return GENERATED_SYMBOLS.indexOf(possibleSymbol) > -1;
  };
  exports.getOwner = function (object) {
    return object[OWNER];
  };
  exports.setOwner = function (object, owner) {
    object[OWNER] = owner;
  };
  exports.OWNER = OWNER;
  exports.assign = _assign || assign;
  exports.assignPolyfill = assign;
  exports.dictionary = function (parent) {
    var dict = Object.create(parent);
    dict['_dict'] = null;
    delete dict['_dict'];
    return dict;
  };
  exports.uuid = uuid;
  exports.GUID_KEY = GUID_KEY;
  exports.generateGuid = function (obj) {
    var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : GUID_PREFIX;

    var guid = prefix + uuid();

    if (isObject(obj)) {
      OBJECT_GUIDS.set(obj, guid);
    }

    return guid;
  };
  exports.guidFor = function (value) {
    var guid = void 0,
        type;

    if (isObject(value)) {
      guid = OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        guid = GUID_PREFIX + uuid();
        OBJECT_GUIDS.set(value, guid);
      }
    } else {
      guid = NON_OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        type = typeof value;


        if (type === 'string') {
          guid = 'st' + uuid();
        } else if (type === 'number') {
          guid = 'nu' + uuid();
        } else if (type === 'symbol') {
          guid = 'sy' + uuid();
        } else {
          guid = '(' + value + ')';
        }

        NON_OBJECT_GUIDS.set(value, guid);
      }
    }

    return guid;
  };
  exports.intern = intern;
  exports.checkHasSuper = checkHasSuper;
  exports.ROOT = ROOT;
  exports.wrap = function (func, superFunc) {
    if (!hasSuper(func)) {
      return func;
    }
    // ensure an unwrapped super that calls _super is wrapped with a terminal _super
    if (!superFunc.wrappedFunction && hasSuper(superFunc)) {
      return _wrap(func, _wrap(superFunc, ROOT));
    }
    return _wrap(func, superFunc);
  };
  exports.inspect = function (obj) {
    if (obj === null) {
      return 'null';
    }
    if (obj === undefined) {
      return 'undefined';
    }
    if (Array.isArray(obj)) {
      return '[' + obj + ']';
    }
    // for non objects
    var type = typeof obj;
    if (type !== 'object' && type !== 'symbol') {
      return '' + obj;
    }
    // overridden toString
    if (typeof obj.toString === 'function' && obj.toString !== objectToString) {
      return obj.toString();
    }

    // Object.prototype.toString === {}.toString
    var v = void 0;
    var ret = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        v = obj[key];
        if (v === 'toString') {
          continue;
        } // ignore useless items
        if (typeof v === 'function') {
          v = 'function() { ... }';
        }

        if (v && typeof v.toString !== 'function') {
          ret.push(key + ': ' + objectToString.call(v));
        } else {
          ret.push(key + ': ' + v);
        }
      }
    }
    return '{' + ret.join(', ') + '}';
  };
  exports.lookupDescriptor = function (obj, keyName) {
    var current = obj,
        descriptor;
    while (current) {
      descriptor = Object.getOwnPropertyDescriptor(current, keyName);


      if (descriptor) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    }

    return null;
  };
  exports.canInvoke = canInvoke;
  exports.tryInvoke = function (obj, methodName, args) {
    var method;

    if (canInvoke(obj, methodName)) {
      method = obj[methodName];

      return method.apply(obj, args);
    }
  };
  exports.makeArray = function (obj) {
    if (obj === null || obj === undefined) {
      return [];
    }
    return isArray(obj) ? obj : [obj];
  };
  exports.getName = function (obj) {
    return NAMES.get(obj);
  };
  exports.setName = function (obj, name) {
    if (obj !== null && typeof obj === 'object' || typeof obj === 'function') NAMES.set(obj, name);
  };
  exports.toString = toString;
  exports.HAS_NATIVE_SYMBOL = HAS_NATIVE_SYMBOL;
  exports.HAS_NATIVE_PROXY = HAS_NATIVE_PROXY;
  exports.WeakSet = WeakSet$1;
  exports.isProxy = function (object) {
    if (isObject(object)) {
      return PROXIES.has(object);
    }
    return false;
  };
  exports.setProxy = function (object) {
    if (isObject(object)) {
      PROXIES.add(object);
    }
  };
});
enifed('ember/features', ['exports', 'ember-environment', 'ember-utils'], function (exports, _emberEnvironment, _emberUtils) {
    'use strict';

    exports.EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER = exports.EMBER_METAL_TRACKED_PROPERTIES = exports.EMBER_TEMPLATE_BLOCK_LET_HELPER = exports.GLIMMER_CUSTOM_COMPONENT_MANAGER = exports.EMBER_MODULE_UNIFICATION = exports.EMBER_ENGINES_MOUNT_PARAMS = exports.EMBER_ROUTING_ROUTER_SERVICE = exports.EMBER_GLIMMER_NAMED_ARGUMENTS = exports.EMBER_IMPROVED_INSTRUMENTATION = exports.EMBER_LIBRARIES_ISREGISTERED = exports.FEATURES_STRIPPED_TEST = exports.FEATURES = exports.DEFAULT_FEATURES = undefined;
    var DEFAULT_FEATURES = exports.DEFAULT_FEATURES = { "features-stripped-test": false, "ember-libraries-isregistered": false, "ember-improved-instrumentation": false, "ember-glimmer-named-arguments": true, "ember-routing-router-service": true, "ember-engines-mount-params": true, "ember-module-unification": false, "glimmer-custom-component-manager": false, "ember-template-block-let-helper": true, "ember-metal-tracked-properties": false, "ember-glimmer-detect-backtracking-rerender": true };
    var FEATURES = exports.FEATURES = (0, _emberUtils.assign)(DEFAULT_FEATURES, _emberEnvironment.ENV.FEATURES);

    exports.FEATURES_STRIPPED_TEST = FEATURES["features-stripped-test"];
    exports.EMBER_LIBRARIES_ISREGISTERED = FEATURES["ember-libraries-isregistered"];
    exports.EMBER_IMPROVED_INSTRUMENTATION = FEATURES["ember-improved-instrumentation"];
    exports.EMBER_GLIMMER_NAMED_ARGUMENTS = FEATURES["ember-glimmer-named-arguments"];
    exports.EMBER_ROUTING_ROUTER_SERVICE = FEATURES["ember-routing-router-service"];
    exports.EMBER_ENGINES_MOUNT_PARAMS = FEATURES["ember-engines-mount-params"];
    exports.EMBER_MODULE_UNIFICATION = FEATURES["ember-module-unification"];
    exports.GLIMMER_CUSTOM_COMPONENT_MANAGER = FEATURES["glimmer-custom-component-manager"];
    exports.EMBER_TEMPLATE_BLOCK_LET_HELPER = FEATURES["ember-template-block-let-helper"];
    exports.EMBER_METAL_TRACKED_PROPERTIES = FEATURES["ember-metal-tracked-properties"];
    exports.EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER = FEATURES["ember-glimmer-detect-backtracking-rerender"];
});
enifed("ember/version", ["exports"], function (exports) {
  "use strict";

  exports.default = "3.2.2";
});
enifed("handlebars", ["exports"], function (exports) {
  "use strict";

  // File ignored in coverage tests via setting in .istanbul.yml
  /* Jison generated parser */

  var handlebars = function () {
    var parser = { trace: function () {},
      yy: {},
      symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition_plus0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "mustache_repetition0": 49, "mustache_option0": 50, "OPEN_UNESCAPED": 51, "mustache_repetition1": 52, "mustache_option1": 53, "CLOSE_UNESCAPED": 54, "OPEN_PARTIAL": 55, "partialName": 56, "partial_repetition0": 57, "partial_option0": 58, "openPartialBlock": 59, "OPEN_PARTIAL_BLOCK": 60, "openPartialBlock_repetition0": 61, "openPartialBlock_option0": 62, "param": 63, "sexpr": 64, "OPEN_SEXPR": 65, "sexpr_repetition0": 66, "sexpr_option0": 67, "CLOSE_SEXPR": 68, "hash": 69, "hash_repetition_plus0": 70, "hashSegment": 71, "ID": 72, "EQUALS": 73, "blockParams": 74, "OPEN_BLOCK_PARAMS": 75, "blockParams_repetition_plus0": 76, "CLOSE_BLOCK_PARAMS": 77, "path": 78, "dataName": 79, "STRING": 80, "NUMBER": 81, "BOOLEAN": 82, "UNDEFINED": 83, "NULL": 84, "DATA": 85, "pathSegments": 86, "SEP": 87, "$accept": 0, "$end": 1 },
      terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 51: "OPEN_UNESCAPED", 54: "CLOSE_UNESCAPED", 55: "OPEN_PARTIAL", 60: "OPEN_PARTIAL_BLOCK", 65: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 72: "ID", 73: "EQUALS", 75: "OPEN_BLOCK_PARAMS", 77: "CLOSE_BLOCK_PARAMS", 80: "STRING", 81: "NUMBER", 82: "BOOLEAN", 83: "UNDEFINED", 84: "NULL", 85: "DATA", 87: "SEP" },
      productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 5], [8, 5], [11, 5], [12, 3], [59, 5], [63, 1], [63, 1], [64, 5], [69, 1], [71, 3], [74, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [56, 1], [56, 1], [79, 2], [78, 1], [86, 3], [86, 1], [6, 0], [6, 2], [17, 1], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [49, 0], [49, 2], [50, 0], [50, 1], [52, 0], [52, 2], [53, 0], [53, 1], [57, 0], [57, 2], [58, 0], [58, 1], [61, 0], [61, 2], [62, 0], [62, 1], [66, 0], [66, 2], [67, 0], [67, 1], [70, 1], [70, 2], [76, 1], [76, 2]],
      performAction: function (yytext, yyleng, yylineno, yy, yystate,
      /**/$$) {

        var $0 = $$.length - 1,
            inverse,
            program;
        switch (yystate) {
          case 1:
            return $$[$0 - 1];
            break;
          case 2:
            this.$ = yy.prepareProgram($$[$0]);
            break;
          case 3:
            this.$ = $$[$0];
            break;
          case 4:
            this.$ = $$[$0];
            break;
          case 5:
            this.$ = $$[$0];
            break;
          case 6:
            this.$ = $$[$0];
            break;
          case 7:
            this.$ = $$[$0];
            break;
          case 8:
            this.$ = $$[$0];
            break;
          case 9:
            this.$ = {
              type: 'CommentStatement',
              value: yy.stripComment($$[$0]),
              strip: yy.stripFlags($$[$0], $$[$0]),
              loc: yy.locInfo(this._$)
            };

            break;
          case 10:
            this.$ = {
              type: 'ContentStatement',
              original: $$[$0],
              value: $$[$0],
              loc: yy.locInfo(this._$)
            };

            break;
          case 11:
            this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
            break;
          case 12:
            this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
            break;
          case 13:
            this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
            break;
          case 14:
            this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
            break;
          case 15:
            this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
            break;
          case 16:
            this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
            break;
          case 17:
            this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
            break;
          case 18:
            this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
            break;
          case 19:
            inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$), program = yy.prepareProgram([inverse], $$[$0 - 1].loc);

            program.chained = true;

            this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

            break;
          case 20:
            this.$ = $$[$0];
            break;
          case 21:
            this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
            break;
          case 22:
            this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
            break;
          case 23:
            this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
            break;
          case 24:
            this.$ = {
              type: 'PartialStatement',
              name: $$[$0 - 3],
              params: $$[$0 - 2],
              hash: $$[$0 - 1],
              indent: '',
              strip: yy.stripFlags($$[$0 - 4], $$[$0]),
              loc: yy.locInfo(this._$)
            };

            break;
          case 25:
            this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
            break;
          case 26:
            this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
            break;
          case 27:
            this.$ = $$[$0];
            break;
          case 28:
            this.$ = $$[$0];
            break;
          case 29:
            this.$ = {
              type: 'SubExpression',
              path: $$[$0 - 3],
              params: $$[$0 - 2],
              hash: $$[$0 - 1],
              loc: yy.locInfo(this._$)
            };

            break;
          case 30:
            this.$ = { type: 'Hash', pairs: $$[$0], loc: yy.locInfo(this._$) };
            break;
          case 31:
            this.$ = { type: 'HashPair', key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
            break;
          case 32:
            this.$ = yy.id($$[$0 - 1]);
            break;
          case 33:
            this.$ = $$[$0];
            break;
          case 34:
            this.$ = $$[$0];
            break;
          case 35:
            this.$ = { type: 'StringLiteral', value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
            break;
          case 36:
            this.$ = { type: 'NumberLiteral', value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
            break;
          case 37:
            this.$ = { type: 'BooleanLiteral', value: $$[$0] === 'true', original: $$[$0] === 'true', loc: yy.locInfo(this._$) };
            break;
          case 38:
            this.$ = { type: 'UndefinedLiteral', original: undefined, value: undefined, loc: yy.locInfo(this._$) };
            break;
          case 39:
            this.$ = { type: 'NullLiteral', original: null, value: null, loc: yy.locInfo(this._$) };
            break;
          case 40:
            this.$ = $$[$0];
            break;
          case 41:
            this.$ = $$[$0];
            break;
          case 42:
            this.$ = yy.preparePath(true, $$[$0], this._$);
            break;
          case 43:
            this.$ = yy.preparePath(false, $$[$0], this._$);
            break;
          case 44:
            $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
            break;
          case 45:
            this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
            break;
          case 46:
            this.$ = [];
            break;
          case 47:
            $$[$0 - 1].push($$[$0]);
            break;
          case 48:
            this.$ = [$$[$0]];
            break;
          case 49:
            $$[$0 - 1].push($$[$0]);
            break;
          case 50:
            this.$ = [];
            break;
          case 51:
            $$[$0 - 1].push($$[$0]);
            break;
          case 58:
            this.$ = [];
            break;
          case 59:
            $$[$0 - 1].push($$[$0]);
            break;
          case 64:
            this.$ = [];
            break;
          case 65:
            $$[$0 - 1].push($$[$0]);
            break;
          case 70:
            this.$ = [];
            break;
          case 71:
            $$[$0 - 1].push($$[$0]);
            break;
          case 78:
            this.$ = [];
            break;
          case 79:
            $$[$0 - 1].push($$[$0]);
            break;
          case 82:
            this.$ = [];
            break;
          case 83:
            $$[$0 - 1].push($$[$0]);
            break;
          case 86:
            this.$ = [];
            break;
          case 87:
            $$[$0 - 1].push($$[$0]);
            break;
          case 90:
            this.$ = [];
            break;
          case 91:
            $$[$0 - 1].push($$[$0]);
            break;
          case 94:
            this.$ = [];
            break;
          case 95:
            $$[$0 - 1].push($$[$0]);
            break;
          case 98:
            this.$ = [$$[$0]];
            break;
          case 99:
            $$[$0 - 1].push($$[$0]);
            break;
          case 100:
            this.$ = [$$[$0]];
            break;
          case 101:
            $$[$0 - 1].push($$[$0]);
            break;
        }
      },
      table: [{ 3: 1, 4: 2, 5: [2, 46], 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: [1, 12], 15: [1, 20], 16: 17, 19: [1, 23], 24: 15, 27: 16, 29: [1, 21], 34: [1, 22], 39: [2, 2], 44: [2, 2], 47: [2, 2], 48: [1, 13], 51: [1, 14], 55: [1, 18], 59: 19, 60: [1, 24] }, { 1: [2, 1] }, { 5: [2, 47], 14: [2, 47], 15: [2, 47], 19: [2, 47], 29: [2, 47], 34: [2, 47], 39: [2, 47], 44: [2, 47], 47: [2, 47], 48: [2, 47], 51: [2, 47], 55: [2, 47], 60: [2, 47] }, { 5: [2, 3], 14: [2, 3], 15: [2, 3], 19: [2, 3], 29: [2, 3], 34: [2, 3], 39: [2, 3], 44: [2, 3], 47: [2, 3], 48: [2, 3], 51: [2, 3], 55: [2, 3], 60: [2, 3] }, { 5: [2, 4], 14: [2, 4], 15: [2, 4], 19: [2, 4], 29: [2, 4], 34: [2, 4], 39: [2, 4], 44: [2, 4], 47: [2, 4], 48: [2, 4], 51: [2, 4], 55: [2, 4], 60: [2, 4] }, { 5: [2, 5], 14: [2, 5], 15: [2, 5], 19: [2, 5], 29: [2, 5], 34: [2, 5], 39: [2, 5], 44: [2, 5], 47: [2, 5], 48: [2, 5], 51: [2, 5], 55: [2, 5], 60: [2, 5] }, { 5: [2, 6], 14: [2, 6], 15: [2, 6], 19: [2, 6], 29: [2, 6], 34: [2, 6], 39: [2, 6], 44: [2, 6], 47: [2, 6], 48: [2, 6], 51: [2, 6], 55: [2, 6], 60: [2, 6] }, { 5: [2, 7], 14: [2, 7], 15: [2, 7], 19: [2, 7], 29: [2, 7], 34: [2, 7], 39: [2, 7], 44: [2, 7], 47: [2, 7], 48: [2, 7], 51: [2, 7], 55: [2, 7], 60: [2, 7] }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 19: [2, 8], 29: [2, 8], 34: [2, 8], 39: [2, 8], 44: [2, 8], 47: [2, 8], 48: [2, 8], 51: [2, 8], 55: [2, 8], 60: [2, 8] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 19: [2, 9], 29: [2, 9], 34: [2, 9], 39: [2, 9], 44: [2, 9], 47: [2, 9], 48: [2, 9], 51: [2, 9], 55: [2, 9], 60: [2, 9] }, { 20: 25, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 36, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 37, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 4: 38, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 13: 40, 15: [1, 20], 17: 39 }, { 20: 42, 56: 41, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 45, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 18: [2, 10], 19: [2, 10], 29: [2, 10], 34: [2, 10], 39: [2, 10], 44: [2, 10], 47: [2, 10], 48: [2, 10], 51: [2, 10], 55: [2, 10], 60: [2, 10] }, { 20: 46, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 47, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 48, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 42, 56: 49, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [2, 78], 49: 50, 65: [2, 78], 72: [2, 78], 80: [2, 78], 81: [2, 78], 82: [2, 78], 83: [2, 78], 84: [2, 78], 85: [2, 78] }, { 23: [2, 33], 33: [2, 33], 54: [2, 33], 65: [2, 33], 68: [2, 33], 72: [2, 33], 75: [2, 33], 80: [2, 33], 81: [2, 33], 82: [2, 33], 83: [2, 33], 84: [2, 33], 85: [2, 33] }, { 23: [2, 34], 33: [2, 34], 54: [2, 34], 65: [2, 34], 68: [2, 34], 72: [2, 34], 75: [2, 34], 80: [2, 34], 81: [2, 34], 82: [2, 34], 83: [2, 34], 84: [2, 34], 85: [2, 34] }, { 23: [2, 35], 33: [2, 35], 54: [2, 35], 65: [2, 35], 68: [2, 35], 72: [2, 35], 75: [2, 35], 80: [2, 35], 81: [2, 35], 82: [2, 35], 83: [2, 35], 84: [2, 35], 85: [2, 35] }, { 23: [2, 36], 33: [2, 36], 54: [2, 36], 65: [2, 36], 68: [2, 36], 72: [2, 36], 75: [2, 36], 80: [2, 36], 81: [2, 36], 82: [2, 36], 83: [2, 36], 84: [2, 36], 85: [2, 36] }, { 23: [2, 37], 33: [2, 37], 54: [2, 37], 65: [2, 37], 68: [2, 37], 72: [2, 37], 75: [2, 37], 80: [2, 37], 81: [2, 37], 82: [2, 37], 83: [2, 37], 84: [2, 37], 85: [2, 37] }, { 23: [2, 38], 33: [2, 38], 54: [2, 38], 65: [2, 38], 68: [2, 38], 72: [2, 38], 75: [2, 38], 80: [2, 38], 81: [2, 38], 82: [2, 38], 83: [2, 38], 84: [2, 38], 85: [2, 38] }, { 23: [2, 39], 33: [2, 39], 54: [2, 39], 65: [2, 39], 68: [2, 39], 72: [2, 39], 75: [2, 39], 80: [2, 39], 81: [2, 39], 82: [2, 39], 83: [2, 39], 84: [2, 39], 85: [2, 39] }, { 23: [2, 43], 33: [2, 43], 54: [2, 43], 65: [2, 43], 68: [2, 43], 72: [2, 43], 75: [2, 43], 80: [2, 43], 81: [2, 43], 82: [2, 43], 83: [2, 43], 84: [2, 43], 85: [2, 43], 87: [1, 51] }, { 72: [1, 35], 86: 52 }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 52: 53, 54: [2, 82], 65: [2, 82], 72: [2, 82], 80: [2, 82], 81: [2, 82], 82: [2, 82], 83: [2, 82], 84: [2, 82], 85: [2, 82] }, { 25: 54, 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 55, 47: [2, 54] }, { 28: 60, 43: 61, 44: [1, 59], 47: [2, 56] }, { 13: 63, 15: [1, 20], 18: [1, 62] }, { 15: [2, 48], 18: [2, 48] }, { 33: [2, 86], 57: 64, 65: [2, 86], 72: [2, 86], 80: [2, 86], 81: [2, 86], 82: [2, 86], 83: [2, 86], 84: [2, 86], 85: [2, 86] }, { 33: [2, 40], 65: [2, 40], 72: [2, 40], 80: [2, 40], 81: [2, 40], 82: [2, 40], 83: [2, 40], 84: [2, 40], 85: [2, 40] }, { 33: [2, 41], 65: [2, 41], 72: [2, 41], 80: [2, 41], 81: [2, 41], 82: [2, 41], 83: [2, 41], 84: [2, 41], 85: [2, 41] }, { 20: 65, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 66, 47: [1, 67] }, { 30: 68, 33: [2, 58], 65: [2, 58], 72: [2, 58], 75: [2, 58], 80: [2, 58], 81: [2, 58], 82: [2, 58], 83: [2, 58], 84: [2, 58], 85: [2, 58] }, { 33: [2, 64], 35: 69, 65: [2, 64], 72: [2, 64], 75: [2, 64], 80: [2, 64], 81: [2, 64], 82: [2, 64], 83: [2, 64], 84: [2, 64], 85: [2, 64] }, { 21: 70, 23: [2, 50], 65: [2, 50], 72: [2, 50], 80: [2, 50], 81: [2, 50], 82: [2, 50], 83: [2, 50], 84: [2, 50], 85: [2, 50] }, { 33: [2, 90], 61: 71, 65: [2, 90], 72: [2, 90], 80: [2, 90], 81: [2, 90], 82: [2, 90], 83: [2, 90], 84: [2, 90], 85: [2, 90] }, { 20: 75, 33: [2, 80], 50: 72, 63: 73, 64: 76, 65: [1, 44], 69: 74, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 72: [1, 80] }, { 23: [2, 42], 33: [2, 42], 54: [2, 42], 65: [2, 42], 68: [2, 42], 72: [2, 42], 75: [2, 42], 80: [2, 42], 81: [2, 42], 82: [2, 42], 83: [2, 42], 84: [2, 42], 85: [2, 42], 87: [1, 51] }, { 20: 75, 53: 81, 54: [2, 84], 63: 82, 64: 76, 65: [1, 44], 69: 83, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 84, 47: [1, 67] }, { 47: [2, 55] }, { 4: 85, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 47: [2, 20] }, { 20: 86, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 87, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 26: 88, 47: [1, 67] }, { 47: [2, 57] }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 19: [2, 11], 29: [2, 11], 34: [2, 11], 39: [2, 11], 44: [2, 11], 47: [2, 11], 48: [2, 11], 51: [2, 11], 55: [2, 11], 60: [2, 11] }, { 15: [2, 49], 18: [2, 49] }, { 20: 75, 33: [2, 88], 58: 89, 63: 90, 64: 76, 65: [1, 44], 69: 91, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 65: [2, 94], 66: 92, 68: [2, 94], 72: [2, 94], 80: [2, 94], 81: [2, 94], 82: [2, 94], 83: [2, 94], 84: [2, 94], 85: [2, 94] }, { 5: [2, 25], 14: [2, 25], 15: [2, 25], 19: [2, 25], 29: [2, 25], 34: [2, 25], 39: [2, 25], 44: [2, 25], 47: [2, 25], 48: [2, 25], 51: [2, 25], 55: [2, 25], 60: [2, 25] }, { 20: 93, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 31: 94, 33: [2, 60], 63: 95, 64: 76, 65: [1, 44], 69: 96, 70: 77, 71: 78, 72: [1, 79], 75: [2, 60], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 66], 36: 97, 63: 98, 64: 76, 65: [1, 44], 69: 99, 70: 77, 71: 78, 72: [1, 79], 75: [2, 66], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 22: 100, 23: [2, 52], 63: 101, 64: 76, 65: [1, 44], 69: 102, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 92], 62: 103, 63: 104, 64: 76, 65: [1, 44], 69: 105, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 106] }, { 33: [2, 79], 65: [2, 79], 72: [2, 79], 80: [2, 79], 81: [2, 79], 82: [2, 79], 83: [2, 79], 84: [2, 79], 85: [2, 79] }, { 33: [2, 81] }, { 23: [2, 27], 33: [2, 27], 54: [2, 27], 65: [2, 27], 68: [2, 27], 72: [2, 27], 75: [2, 27], 80: [2, 27], 81: [2, 27], 82: [2, 27], 83: [2, 27], 84: [2, 27], 85: [2, 27] }, { 23: [2, 28], 33: [2, 28], 54: [2, 28], 65: [2, 28], 68: [2, 28], 72: [2, 28], 75: [2, 28], 80: [2, 28], 81: [2, 28], 82: [2, 28], 83: [2, 28], 84: [2, 28], 85: [2, 28] }, { 23: [2, 30], 33: [2, 30], 54: [2, 30], 68: [2, 30], 71: 107, 72: [1, 108], 75: [2, 30] }, { 23: [2, 98], 33: [2, 98], 54: [2, 98], 68: [2, 98], 72: [2, 98], 75: [2, 98] }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 73: [1, 109], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 23: [2, 44], 33: [2, 44], 54: [2, 44], 65: [2, 44], 68: [2, 44], 72: [2, 44], 75: [2, 44], 80: [2, 44], 81: [2, 44], 82: [2, 44], 83: [2, 44], 84: [2, 44], 85: [2, 44], 87: [2, 44] }, { 54: [1, 110] }, { 54: [2, 83], 65: [2, 83], 72: [2, 83], 80: [2, 83], 81: [2, 83], 82: [2, 83], 83: [2, 83], 84: [2, 83], 85: [2, 83] }, { 54: [2, 85] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 19: [2, 13], 29: [2, 13], 34: [2, 13], 39: [2, 13], 44: [2, 13], 47: [2, 13], 48: [2, 13], 51: [2, 13], 55: [2, 13], 60: [2, 13] }, { 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 112, 46: 111, 47: [2, 76] }, { 33: [2, 70], 40: 113, 65: [2, 70], 72: [2, 70], 75: [2, 70], 80: [2, 70], 81: [2, 70], 82: [2, 70], 83: [2, 70], 84: [2, 70], 85: [2, 70] }, { 47: [2, 18] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 19: [2, 14], 29: [2, 14], 34: [2, 14], 39: [2, 14], 44: [2, 14], 47: [2, 14], 48: [2, 14], 51: [2, 14], 55: [2, 14], 60: [2, 14] }, { 33: [1, 114] }, { 33: [2, 87], 65: [2, 87], 72: [2, 87], 80: [2, 87], 81: [2, 87], 82: [2, 87], 83: [2, 87], 84: [2, 87], 85: [2, 87] }, { 33: [2, 89] }, { 20: 75, 63: 116, 64: 76, 65: [1, 44], 67: 115, 68: [2, 96], 69: 117, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 118] }, { 32: 119, 33: [2, 62], 74: 120, 75: [1, 121] }, { 33: [2, 59], 65: [2, 59], 72: [2, 59], 75: [2, 59], 80: [2, 59], 81: [2, 59], 82: [2, 59], 83: [2, 59], 84: [2, 59], 85: [2, 59] }, { 33: [2, 61], 75: [2, 61] }, { 33: [2, 68], 37: 122, 74: 123, 75: [1, 121] }, { 33: [2, 65], 65: [2, 65], 72: [2, 65], 75: [2, 65], 80: [2, 65], 81: [2, 65], 82: [2, 65], 83: [2, 65], 84: [2, 65], 85: [2, 65] }, { 33: [2, 67], 75: [2, 67] }, { 23: [1, 124] }, { 23: [2, 51], 65: [2, 51], 72: [2, 51], 80: [2, 51], 81: [2, 51], 82: [2, 51], 83: [2, 51], 84: [2, 51], 85: [2, 51] }, { 23: [2, 53] }, { 33: [1, 125] }, { 33: [2, 91], 65: [2, 91], 72: [2, 91], 80: [2, 91], 81: [2, 91], 82: [2, 91], 83: [2, 91], 84: [2, 91], 85: [2, 91] }, { 33: [2, 93] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 19: [2, 22], 29: [2, 22], 34: [2, 22], 39: [2, 22], 44: [2, 22], 47: [2, 22], 48: [2, 22], 51: [2, 22], 55: [2, 22], 60: [2, 22] }, { 23: [2, 99], 33: [2, 99], 54: [2, 99], 68: [2, 99], 72: [2, 99], 75: [2, 99] }, { 73: [1, 109] }, { 20: 75, 63: 126, 64: 76, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 19: [2, 23], 29: [2, 23], 34: [2, 23], 39: [2, 23], 44: [2, 23], 47: [2, 23], 48: [2, 23], 51: [2, 23], 55: [2, 23], 60: [2, 23] }, { 47: [2, 19] }, { 47: [2, 77] }, { 20: 75, 33: [2, 72], 41: 127, 63: 128, 64: 76, 65: [1, 44], 69: 129, 70: 77, 71: 78, 72: [1, 79], 75: [2, 72], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 24], 14: [2, 24], 15: [2, 24], 19: [2, 24], 29: [2, 24], 34: [2, 24], 39: [2, 24], 44: [2, 24], 47: [2, 24], 48: [2, 24], 51: [2, 24], 55: [2, 24], 60: [2, 24] }, { 68: [1, 130] }, { 65: [2, 95], 68: [2, 95], 72: [2, 95], 80: [2, 95], 81: [2, 95], 82: [2, 95], 83: [2, 95], 84: [2, 95], 85: [2, 95] }, { 68: [2, 97] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 19: [2, 21], 29: [2, 21], 34: [2, 21], 39: [2, 21], 44: [2, 21], 47: [2, 21], 48: [2, 21], 51: [2, 21], 55: [2, 21], 60: [2, 21] }, { 33: [1, 131] }, { 33: [2, 63] }, { 72: [1, 133], 76: 132 }, { 33: [1, 134] }, { 33: [2, 69] }, { 15: [2, 12] }, { 14: [2, 26], 15: [2, 26], 19: [2, 26], 29: [2, 26], 34: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 55: [2, 26], 60: [2, 26] }, { 23: [2, 31], 33: [2, 31], 54: [2, 31], 68: [2, 31], 72: [2, 31], 75: [2, 31] }, { 33: [2, 74], 42: 135, 74: 136, 75: [1, 121] }, { 33: [2, 71], 65: [2, 71], 72: [2, 71], 75: [2, 71], 80: [2, 71], 81: [2, 71], 82: [2, 71], 83: [2, 71], 84: [2, 71], 85: [2, 71] }, { 33: [2, 73], 75: [2, 73] }, { 23: [2, 29], 33: [2, 29], 54: [2, 29], 65: [2, 29], 68: [2, 29], 72: [2, 29], 75: [2, 29], 80: [2, 29], 81: [2, 29], 82: [2, 29], 83: [2, 29], 84: [2, 29], 85: [2, 29] }, { 14: [2, 15], 15: [2, 15], 19: [2, 15], 29: [2, 15], 34: [2, 15], 39: [2, 15], 44: [2, 15], 47: [2, 15], 48: [2, 15], 51: [2, 15], 55: [2, 15], 60: [2, 15] }, { 72: [1, 138], 77: [1, 137] }, { 72: [2, 100], 77: [2, 100] }, { 14: [2, 16], 15: [2, 16], 19: [2, 16], 29: [2, 16], 34: [2, 16], 44: [2, 16], 47: [2, 16], 48: [2, 16], 51: [2, 16], 55: [2, 16], 60: [2, 16] }, { 33: [1, 139] }, { 33: [2, 75] }, { 33: [2, 32] }, { 72: [2, 101], 77: [2, 101] }, { 14: [2, 17], 15: [2, 17], 19: [2, 17], 29: [2, 17], 34: [2, 17], 39: [2, 17], 44: [2, 17], 47: [2, 17], 48: [2, 17], 51: [2, 17], 55: [2, 17], 60: [2, 17] }],
      defaultActions: { 4: [2, 1], 55: [2, 55], 57: [2, 20], 61: [2, 57], 74: [2, 81], 83: [2, 85], 87: [2, 18], 91: [2, 89], 102: [2, 53], 105: [2, 93], 111: [2, 19], 112: [2, 77], 117: [2, 97], 120: [2, 63], 123: [2, 69], 124: [2, 12], 136: [2, 75], 137: [2, 32] },
      parseError: function (str) {
        throw new Error(str);
      },
      parse: function (input) {
        var self = this,
            stack = [0],
            vstack = [null],
            lstack = [],
            table = this.table,
            yytext = "",
            yylineno = 0,
            yyleng = 0,
            recovering = 0,
            errStr;
        this.lexer.setInput(input);
        this.lexer.yy = this.yy;
        this.yy.lexer = this.lexer;
        this.yy.parser = this;
        if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
        var yyloc = this.lexer.yylloc;
        lstack.push(yyloc);
        var ranges = this.lexer.options && this.lexer.options.ranges;
        if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
        function lex() {
          var token = self.lexer.lex() || 1;

          if (typeof token !== "number") {
            token = self.symbols_[token] || token;
          }
          return token;
        }
        var symbol,
            preErrorSymbol,
            state,
            action,
            r,
            yyval = {},
            p,
            len,
            newState,
            expected;
        while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
            action = this.defaultActions[state];
          } else {
            if (symbol === null || typeof symbol == "undefined") {
              symbol = lex();
            }
            action = table[state] && table[state][symbol];
          }
          if (typeof action === "undefined" || !action.length || !action[0]) {
            errStr = "";

            if (!recovering) {
              expected = [];
              for (p in table[state]) {
                if (this.terminals_[p] && p > 2) {
                  expected.push("'" + this.terminals_[p] + "'");
                }
              }if (this.lexer.showPosition) {
                errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
              } else {
                errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
              }
              this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
            }
          }
          if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
          }
          switch (action[0]) {
            case 1:
              stack.push(symbol);
              vstack.push(this.lexer.yytext);
              lstack.push(this.lexer.yylloc);
              stack.push(action[1]);
              symbol = null;
              if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0) recovering--;
              } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
              }
              break;
            case 2:
              len = this.productions_[action[1]][1];
              yyval.$ = vstack[vstack.length - len];
              yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
              if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
              }
              r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
              if (typeof r !== "undefined") {
                return r;
              }
              if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
              }
              stack.push(this.productions_[action[1]][0]);
              vstack.push(yyval.$);
              lstack.push(yyval._$);
              newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
              stack.push(newState);
              break;
            case 3:
              return true;
          }
        }
        return true;
      }
    };
    /* Jison generated lexer */
    var lexer = function () {
      var lexer = { EOF: 1,
        parseError: function (str, hash) {
          if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
          } else {
            throw new Error(str);
          }
        },
        setInput: function (input) {
          this._input = input;
          this._more = this._less = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = '';
          this.conditionStack = ['INITIAL'];
          this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
          if (this.options.ranges) this.yylloc.range = [0, 0];
          this.offset = 0;
          return this;
        },
        input: function () {
          var ch = this._input[0];
          this.yytext += ch;
          this.yyleng++;
          this.offset++;
          this.match += ch;
          this.matched += ch;
          var lines = ch.match(/(?:\r\n?|\n).*/g);
          if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
          } else {
            this.yylloc.last_column++;
          }
          if (this.options.ranges) this.yylloc.range[1]++;

          this._input = this._input.slice(1);
          return ch;
        },
        unput: function (ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);

          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
          //this.yyleng -= len;
          this.offset -= len;
          var oldLines = this.match.split(/(?:\r\n?|\n)/g);
          this.match = this.match.substr(0, this.match.length - 1);
          this.matched = this.matched.substr(0, this.matched.length - 1);

          if (lines.length - 1) this.yylineno -= lines.length - 1;
          var r = this.yylloc.range;

          this.yylloc = { first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
          };

          if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          return this;
        },
        more: function () {
          this._more = true;
          return this;
        },
        less: function (n) {
          this.unput(this.match.slice(n));
        },
        pastInput: function () {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
        },
        upcomingInput: function () {
          var next = this.match;
          if (next.length < 20) {
            next += this._input.substr(0, 20 - next.length);
          }
          return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
        },
        showPosition: function () {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c + "^";
        },
        next: function () {
          if (this.done) {
            return this.EOF;
          }
          if (!this._input) this.done = true;

          var token, match, tempMatch, index, lines, i;
          if (!this._more) {
            this.yytext = '';
            this.match = '';
          }
          var rules = this._currentRules();
          for (i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
              match = tempMatch;
              index = i;
              if (!this.options.flex) break;
            }
          }
          if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = { first_line: this.yylloc.last_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.last_column,
              last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
              this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;else return;
          }
          if (this._input === "") {
            return this.EOF;
          } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), { text: "", token: null, line: this.yylineno });
          }
        },
        lex: function () {
          var r = this.next();
          if (typeof r !== 'undefined') {
            return r;
          } else {
            return this.lex();
          }
        },
        begin: function (condition) {
          this.conditionStack.push(condition);
        },
        popState: function () {
          return this.conditionStack.pop();
        },
        _currentRules: function () {
          return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        },
        topState: function () {
          return this.conditionStack[this.conditionStack.length - 2];
        },
        pushState: function (condition) {
          this.begin(condition);
        } };
      lexer.options = {};
      lexer.performAction = function (yy, yy_,
      /**/$avoiding_name_collisions) {

        function strip(start, end) {
          return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
        }
        switch ($avoiding_name_collisions) {
          case 0:
            if (yy_.yytext.slice(-2) === "\\\\") {
              strip(0, 1);
              this.begin("mu");
            } else if (yy_.yytext.slice(-1) === "\\") {
              strip(0, 1);
              this.begin("emu");
            } else {
              this.begin("mu");
            }
            if (yy_.yytext) return 15;

            break;
          case 1:
            return 15;
            break;
          case 2:
            this.popState();
            return 15;

            break;
          case 3:
            this.begin('raw');return 15;
            break;
          case 4:
            this.popState();
            // Should be using `this.topState()` below, but it currently
            // returns the second top instead of the first top. Opened an
            // issue about it at https://github.com/zaach/jison/issues/291
            if (this.conditionStack[this.conditionStack.length - 1] === 'raw') {
              return 15;
            } else {
              yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
              return 'END_RAW_BLOCK';
            }

            break;
          case 5:
            return 15;
            break;
          case 6:
            this.popState();
            return 14;

            break;
          case 7:
            return 65;
            break;
          case 8:
            return 68;
            break;
          case 9:
            return 19;
            break;
          case 10:
            this.popState();
            this.begin('raw');
            return 23;

            break;
          case 11:
            return 55;
            break;
          case 12:
            return 60;
            break;
          case 13:
            return 29;
            break;
          case 14:
            return 47;
            break;
          case 15:
            this.popState();return 44;
            break;
          case 16:
            this.popState();return 44;
            break;
          case 17:
            return 34;
            break;
          case 18:
            return 39;
            break;
          case 19:
            return 51;
            break;
          case 20:
            return 48;
            break;
          case 21:
            this.unput(yy_.yytext);
            this.popState();
            this.begin('com');

            break;
          case 22:
            this.popState();
            return 14;

            break;
          case 23:
            return 48;
            break;
          case 24:
            return 73;
            break;
          case 25:
            return 72;
            break;
          case 26:
            return 72;
            break;
          case 27:
            return 87;
            break;
          case 28:
            // ignore whitespace
            break;
          case 29:
            this.popState();return 54;
            break;
          case 30:
            this.popState();return 33;
            break;
          case 31:
            yy_.yytext = strip(1, 2).replace(/\\"/g, '"');return 80;
            break;
          case 32:
            yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 80;
            break;
          case 33:
            return 85;
            break;
          case 34:
            return 82;
            break;
          case 35:
            return 82;
            break;
          case 36:
            return 83;
            break;
          case 37:
            return 84;
            break;
          case 38:
            return 81;
            break;
          case 39:
            return 75;
            break;
          case 40:
            return 77;
            break;
          case 41:
            return 72;
            break;
          case 42:
            yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, '$1');return 72;
            break;
          case 43:
            return 'INVALID';
            break;
          case 44:
            return 5;
            break;
        }
      };
      lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^\/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/];
      lexer.conditions = { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "INITIAL": { "rules": [0, 1, 44], "inclusive": true } };
      return lexer;
    }();
    parser.lexer = lexer;
    function Parser() {
      this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
  }();

  var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

  function Exception(message, node) {
    var loc = node && node.loc,
        line = void 0,
        column = void 0,
        idx;
    if (loc) {
      line = loc.start.line;
      column = loc.start.column;

      message += ' - ' + line + ':' + column;
    }

    var tmp = Error.prototype.constructor.call(this, message);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }

    /* istanbul ignore else */
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Exception);
    }

    try {
      if (loc) {
        this.lineNumber = line;

        // Work around issue under safari where we can't directly set the column value
        /* istanbul ignore next */
        if (Object.defineProperty) {
          Object.defineProperty(this, 'column', {
            value: column,
            enumerable: true
          });
        } else {
          this.column = column;
        }
      }
    } catch (nop) {
      /* Ignore if the browser is very particular */
    }
  }

  Exception.prototype = new Error();

  function Visitor() {
    this.parents = [];
  }

  Visitor.prototype = {
    constructor: Visitor,
    mutating: false,

    // Visits a given value. If mutating, will replace the value if necessary.
    acceptKey: function (node, name) {
      var value = this.accept(node[name]);
      if (this.mutating) {
        // Hacky sanity check: This may have a few false positives for type for the helper
        // methods but will generally do the right thing without a lot of overhead.
        if (value && !Visitor.prototype[value.type]) {
          throw new Exception('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
        }
        node[name] = value;
      }
    },

    // Performs an accept operation with added sanity check to ensure
    // required keys are not removed.
    acceptRequired: function (node, name) {
      this.acceptKey(node, name);

      if (!node[name]) {
        throw new Exception(node.type + ' requires ' + name);
      }
    },

    // Traverses a given array. If mutating, empty respnses will be removed
    // for child elements.
    acceptArray: function (array) {
      var i, l;

      for (i = 0, l = array.length; i < l; i++) {
        this.acceptKey(array, i);

        if (!array[i]) {
          array.splice(i, 1);
          i--;
          l--;
        }
      }
    },

    accept: function (object) {
      if (!object) {
        return;
      }

      /* istanbul ignore next: Sanity code */
      if (!this[object.type]) {
        throw new Exception('Unknown type: ' + object.type, object);
      }

      if (this.current) {
        this.parents.unshift(this.current);
      }
      this.current = object;

      var ret = this[object.type](object);

      this.current = this.parents.shift();

      if (!this.mutating || ret) {
        return ret;
      } else if (ret !== false) {
        return object;
      }
    },

    Program: function (program) {
      this.acceptArray(program.body);
    },

    MustacheStatement: visitSubExpression,
    Decorator: visitSubExpression,

    BlockStatement: visitBlock,
    DecoratorBlock: visitBlock,

    PartialStatement: visitPartial,
    PartialBlockStatement: function (partial) {
      visitPartial.call(this, partial);

      this.acceptKey(partial, 'program');
    },

    ContentStatement: function () /* content */{},
    CommentStatement: function () /* comment */{},

    SubExpression: visitSubExpression,

    PathExpression: function () /* path */{},

    StringLiteral: function () /* string */{},
    NumberLiteral: function () /* number */{},
    BooleanLiteral: function () /* bool */{},
    UndefinedLiteral: function () /* literal */{},
    NullLiteral: function () /* literal */{},

    Hash: function (hash) {
      this.acceptArray(hash.pairs);
    },
    HashPair: function (pair) {
      this.acceptRequired(pair, 'value');
    }
  };

  function visitSubExpression(mustache) {
    this.acceptRequired(mustache, 'path');
    this.acceptArray(mustache.params);
    this.acceptKey(mustache, 'hash');
  }
  function visitBlock(block) {
    visitSubExpression.call(this, block);

    this.acceptKey(block, 'program');
    this.acceptKey(block, 'inverse');
  }
  function visitPartial(partial) {
    this.acceptRequired(partial, 'name');
    this.acceptArray(partial.params);
    this.acceptKey(partial, 'hash');
  }

  function WhitespaceControl() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    this.options = options;
  }
  WhitespaceControl.prototype = new Visitor();

  WhitespaceControl.prototype.Program = function (program) {
    var doStandalone = !this.options.ignoreStandalone,
        i,
        l,
        current,
        strip,
        _isPrevWhitespace,
        _isNextWhitespace,
        openStandalone,
        closeStandalone,
        inlineStandalone;

    var isRoot = !this.isRootSeen;
    this.isRootSeen = true;

    var body = program.body;
    for (i = 0, l = body.length; i < l; i++) {
      current = body[i], strip = this.accept(current);


      if (!strip) {
        continue;
      }

      _isPrevWhitespace = isPrevWhitespace(body, i, isRoot), _isNextWhitespace = isNextWhitespace(body, i, isRoot), openStandalone = strip.openStandalone && _isPrevWhitespace, closeStandalone = strip.closeStandalone && _isNextWhitespace, inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;


      if (strip.close) {
        omitRight(body, i, true);
      }
      if (strip.open) {
        omitLeft(body, i, true);
      }

      if (doStandalone && inlineStandalone) {
        omitRight(body, i);

        if (omitLeft(body, i)) {
          // If we are on a standalone node, save the indent info for partials
          if (current.type === 'PartialStatement') {
            // Pull out the whitespace from the final line
            current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
          }
        }
      }
      if (doStandalone && openStandalone) {
        omitRight((current.program || current.inverse).body);

        // Strip out the previous content node if it's whitespace only
        omitLeft(body, i);
      }
      if (doStandalone && closeStandalone) {
        // Always strip the next node
        omitRight(body, i);

        omitLeft((current.inverse || current.program).body);
      }
    }

    return program;
  };

  WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function (block) {
    this.accept(block.program);
    this.accept(block.inverse);

    // Find the inverse program that is involed with whitespace stripping.
    var program = block.program || block.inverse,
        inverse = block.program && block.inverse,
        firstInverse = inverse,
        lastInverse = inverse,
        inverseStrip;

    if (inverse && inverse.chained) {
      firstInverse = inverse.body[0].program;

      // Walk the inverse chain to find the last inverse that is actually in the chain.
      while (lastInverse.chained) {
        lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
      }
    }

    var strip = {
      open: block.openStrip.open,
      close: block.closeStrip.close,

      // Determine the standalone candiacy. Basically flag our content as being possibly standalone
      // so our parent can determine if we actually are standalone
      openStandalone: isNextWhitespace(program.body),
      closeStandalone: isPrevWhitespace((firstInverse || program).body)
    };

    if (block.openStrip.close) {
      omitRight(program.body, null, true);
    }

    if (inverse) {
      inverseStrip = block.inverseStrip;


      if (inverseStrip.open) {
        omitLeft(program.body, null, true);
      }

      if (inverseStrip.close) {
        omitRight(firstInverse.body, null, true);
      }
      if (block.closeStrip.open) {
        omitLeft(lastInverse.body, null, true);
      }

      // Find standalone else statments
      if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
        omitLeft(program.body);
        omitRight(firstInverse.body);
      }
    } else if (block.closeStrip.open) {
      omitLeft(program.body, null, true);
    }

    return strip;
  };

  WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function (mustache) {
    return mustache.strip;
  };

  WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
    /* istanbul ignore next */
    var strip = node.strip || {};
    return {
      inlineStandalone: true,
      open: strip.open,
      close: strip.close
    };
  };

  function isPrevWhitespace(body, i, isRoot) {
    if (i === undefined) {
      i = body.length;
    }

    // Nodes that end with newlines are considered whitespace (but are special
    // cased for strip operations)
    var prev = body[i - 1],
        sibling = body[i - 2];
    if (!prev) {
      return isRoot;
    }

    if (prev.type === 'ContentStatement') {
      return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
    }
  }
  function isNextWhitespace(body, i, isRoot) {
    if (i === undefined) {
      i = -1;
    }

    var next = body[i + 1],
        sibling = body[i + 2];
    if (!next) {
      return isRoot;
    }

    if (next.type === 'ContentStatement') {
      return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
    }
  }

  // Marks the node to the right of the position as omitted.
  // I.e. {{foo}}' ' will mark the ' ' node as omitted.
  //
  // If i is undefined, then the first child will be marked as such.
  //
  // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
  // content is met.
  function omitRight(body, i, multiple) {
    var current = body[i == null ? 0 : i + 1];
    if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
      return;
    }

    var original = current.value;
    current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
    current.rightStripped = current.value !== original;
  }

  // Marks the node to the left of the position as omitted.
  // I.e. ' '{{foo}} will mark the ' ' node as omitted.
  //
  // If i is undefined then the last child will be marked as such.
  //
  // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
  // content is met.
  function omitLeft(body, i, multiple) {
    var current = body[i == null ? body.length - 1 : i - 1];
    if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
      return;
    }

    // We omit the last node if it's whitespace only and not preceeded by a non-content node.
    var original = current.value;
    current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
    current.leftStripped = current.value !== original;
    return current.leftStripped;
  }

  function validateClose(open, close) {
    var errorNode;

    close = close.path ? close.path.original : close;

    if (open.path.original !== close) {
      errorNode = { loc: open.path.loc };


      throw new Exception(open.path.original + " doesn't match " + close, errorNode);
    }
  }

  var Helpers = /*#__PURE__*/Object.freeze({
    SourceLocation: function (source, locInfo) {
      this.source = source;
      this.start = {
        line: locInfo.first_line,
        column: locInfo.first_column
      };
      this.end = {
        line: locInfo.last_line,
        column: locInfo.last_column
      };
    },
    id: function (token) {
      if (/^\[.*\]$/.test(token)) {
        return token.substr(1, token.length - 2);
      } else {
        return token;
      }
    },
    stripFlags: function (open, close) {
      return {
        open: open.charAt(2) === '~',
        close: close.charAt(close.length - 3) === '~'
      };
    },
    stripComment: function (comment) {
      return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
    },
    preparePath: function (data, parts, loc) {
      loc = this.locInfo(loc);

      var original = data ? '@' : '',
          dig = [],
          depth = 0,
          i,
          l,
          part,


      // If we have [] syntax then we do not treat path references as operators,
      // i.e. foo.[this] resolves to approximately context.foo['this']
      isLiteral;

      for (i = 0, l = parts.length; i < l; i++) {
        part = parts[i].part, isLiteral = parts[i].original !== part;

        original += (parts[i].separator || '') + part;

        if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
          if (dig.length > 0) {
            throw new Exception('Invalid path: ' + original, { loc: loc });
          } else if (part === '..') {
            depth++;
          }
        } else {
          dig.push(part);
        }
      }

      return {
        type: 'PathExpression',
        data: data,
        depth: depth,
        parts: dig,
        original: original,
        loc: loc
      };
    },
    prepareMustache: function (path, params, hash, open, strip, locInfo) {
      // Must use charAt to support IE pre-10
      var escapeFlag = open.charAt(3) || open.charAt(2);

      var decorator = /\*/.test(open);
      return {
        type: decorator ? 'Decorator' : 'MustacheStatement',
        path: path,
        params: params,
        hash: hash,
        escaped: escapeFlag !== '{' && escapeFlag !== '&',
        strip: strip,
        loc: this.locInfo(locInfo)
      };
    },
    prepareRawBlock: function (openRawBlock, contents, close, locInfo) {
      validateClose(openRawBlock, close);

      locInfo = this.locInfo(locInfo);
      var program = {
        type: 'Program',
        body: contents,
        strip: {},
        loc: locInfo
      };

      return {
        type: 'BlockStatement',
        path: openRawBlock.path,
        params: openRawBlock.params,
        hash: openRawBlock.hash,
        program: program,
        openStrip: {},
        inverseStrip: {},
        closeStrip: {},
        loc: locInfo
      };
    },
    prepareBlock: function (openBlock, program, inverseAndProgram, close, inverted, locInfo) {
      if (close && close.path) {
        validateClose(openBlock, close);
      }

      var decorator = /\*/.test(openBlock.open);

      program.blockParams = openBlock.blockParams;

      var inverse = void 0,
          inverseStrip = void 0;

      if (inverseAndProgram) {
        if (decorator) {
          throw new Exception('Unexpected inverse block on decorator', inverseAndProgram);
        }

        if (inverseAndProgram.chain) {
          inverseAndProgram.program.body[0].closeStrip = close.strip;
        }

        inverseStrip = inverseAndProgram.strip;
        inverse = inverseAndProgram.program;
      }

      if (inverted) {
        inverted = inverse;
        inverse = program;
        program = inverted;
      }

      return {
        type: decorator ? 'DecoratorBlock' : 'BlockStatement',
        path: openBlock.path,
        params: openBlock.params,
        hash: openBlock.hash,
        program: program,
        inverse: inverse,
        openStrip: openBlock.strip,
        inverseStrip: inverseStrip,
        closeStrip: close && close.strip,
        loc: this.locInfo(locInfo)
      };
    },
    prepareProgram: function (statements, loc) {
      var firstLoc, lastLoc;

      if (!loc && statements.length) {
        firstLoc = statements[0].loc, lastLoc = statements[statements.length - 1].loc;

        /* istanbul ignore else */

        if (firstLoc && lastLoc) {
          loc = {
            source: firstLoc.source,
            start: {
              line: firstLoc.start.line,
              column: firstLoc.start.column
            },
            end: {
              line: lastLoc.end.line,
              column: lastLoc.end.column
            }
          };
        }
      }

      return {
        type: 'Program',
        body: statements,
        strip: {},
        loc: loc
      };
    },
    preparePartialBlock: function (open, program, close, locInfo) {
      validateClose(open, close);

      return {
        type: 'PartialBlockStatement',
        name: open.path,
        params: open.params,
        hash: open.hash,
        program: program,
        openStrip: open.strip,
        closeStrip: close && close.strip,
        loc: this.locInfo(locInfo)
      };
    }
  });

  var toString = Object.prototype.toString;

  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  /* eslint-disable func-style */
  var isFunction = function (value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    isFunction = function (value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }

  var yy = {};
  (function (obj /* , ...source */) {
    var i;

    for (i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  })(yy, Helpers);

  exports.parser = handlebars;
  exports.parse = function (input, options) {
    // Just return if an already-compiled AST was passed in.
    if (input.type === 'Program') {
      return input;
    }

    handlebars.yy = yy;

    // Altering the shared object here, but this is ok as parser is a sync operation
    yy.locInfo = function (locInfo) {
      return new yy.SourceLocation(options && options.srcName, locInfo);
    };

    var strip = new WhitespaceControl(options);
    return strip.accept(handlebars.parse(input));
  };
});
/*global enifed, module */
enifed('node-module', ['exports'], function(_exports) {
  var IS_NODE = typeof module === 'object' && typeof module.require === 'function';
  if (IS_NODE) {
    _exports.require = module.require;
    _exports.module = module;
    _exports.IS_NODE = IS_NODE;
  } else {
    _exports.require = null;
    _exports.module = null;
    _exports.IS_NODE = IS_NODE;
  }
});

enifed("simple-html-tokenizer", ["exports"], function (exports) {
    "use strict";

    /**
     * generated from https://raw.githubusercontent.com/w3c/html/26b5126f96f736f796b9e29718138919dd513744/entities.json
     * do not edit
     */

    var namedCharRefs = {
        Aacute: "Á", aacute: "á", Abreve: "Ă", abreve: "ă", ac: "∾", acd: "∿", acE: "∾̳", Acirc: "Â", acirc: "â", acute: "´", Acy: "А", acy: "а", AElig: "Æ", aelig: "æ", af: "\u2061", Afr: "𝔄", afr: "𝔞", Agrave: "À", agrave: "à", alefsym: "ℵ", aleph: "ℵ", Alpha: "Α", alpha: "α", Amacr: "Ā", amacr: "ā", amalg: "⨿", amp: "&", AMP: "&", andand: "⩕", And: "⩓", and: "∧", andd: "⩜", andslope: "⩘", andv: "⩚", ang: "∠", ange: "⦤", angle: "∠", angmsdaa: "⦨", angmsdab: "⦩", angmsdac: "⦪", angmsdad: "⦫", angmsdae: "⦬", angmsdaf: "⦭", angmsdag: "⦮", angmsdah: "⦯", angmsd: "∡", angrt: "∟", angrtvb: "⊾", angrtvbd: "⦝", angsph: "∢", angst: "Å", angzarr: "⍼", Aogon: "Ą", aogon: "ą", Aopf: "𝔸", aopf: "𝕒", apacir: "⩯", ap: "≈", apE: "⩰", ape: "≊", apid: "≋", apos: "'", ApplyFunction: "\u2061", approx: "≈", approxeq: "≊", Aring: "Å", aring: "å", Ascr: "𝒜", ascr: "𝒶", Assign: "≔", ast: "*", asymp: "≈", asympeq: "≍", Atilde: "Ã", atilde: "ã", Auml: "Ä", auml: "ä", awconint: "∳", awint: "⨑", backcong: "≌", backepsilon: "϶", backprime: "‵", backsim: "∽", backsimeq: "⋍", Backslash: "∖", Barv: "⫧", barvee: "⊽", barwed: "⌅", Barwed: "⌆", barwedge: "⌅", bbrk: "⎵", bbrktbrk: "⎶", bcong: "≌", Bcy: "Б", bcy: "б", bdquo: "„", becaus: "∵", because: "∵", Because: "∵", bemptyv: "⦰", bepsi: "϶", bernou: "ℬ", Bernoullis: "ℬ", Beta: "Β", beta: "β", beth: "ℶ", between: "≬", Bfr: "𝔅", bfr: "𝔟", bigcap: "⋂", bigcirc: "◯", bigcup: "⋃", bigodot: "⨀", bigoplus: "⨁", bigotimes: "⨂", bigsqcup: "⨆", bigstar: "★", bigtriangledown: "▽", bigtriangleup: "△", biguplus: "⨄", bigvee: "⋁", bigwedge: "⋀", bkarow: "⤍", blacklozenge: "⧫", blacksquare: "▪", blacktriangle: "▴", blacktriangledown: "▾", blacktriangleleft: "◂", blacktriangleright: "▸", blank: "␣", blk12: "▒", blk14: "░", blk34: "▓", block: "█", bne: "=⃥", bnequiv: "≡⃥", bNot: "⫭", bnot: "⌐", Bopf: "𝔹", bopf: "𝕓", bot: "⊥", bottom: "⊥", bowtie: "⋈", boxbox: "⧉", boxdl: "┐", boxdL: "╕", boxDl: "╖", boxDL: "╗", boxdr: "┌", boxdR: "╒", boxDr: "╓", boxDR: "╔", boxh: "─", boxH: "═", boxhd: "┬", boxHd: "╤", boxhD: "╥", boxHD: "╦", boxhu: "┴", boxHu: "╧", boxhU: "╨", boxHU: "╩", boxminus: "⊟", boxplus: "⊞", boxtimes: "⊠", boxul: "┘", boxuL: "╛", boxUl: "╜", boxUL: "╝", boxur: "└", boxuR: "╘", boxUr: "╙", boxUR: "╚", boxv: "│", boxV: "║", boxvh: "┼", boxvH: "╪", boxVh: "╫", boxVH: "╬", boxvl: "┤", boxvL: "╡", boxVl: "╢", boxVL: "╣", boxvr: "├", boxvR: "╞", boxVr: "╟", boxVR: "╠", bprime: "‵", breve: "˘", Breve: "˘", brvbar: "¦", bscr: "𝒷", Bscr: "ℬ", bsemi: "⁏", bsim: "∽", bsime: "⋍", bsolb: "⧅", bsol: "\\", bsolhsub: "⟈", bull: "•", bullet: "•", bump: "≎", bumpE: "⪮", bumpe: "≏", Bumpeq: "≎", bumpeq: "≏", Cacute: "Ć", cacute: "ć", capand: "⩄", capbrcup: "⩉", capcap: "⩋", cap: "∩", Cap: "⋒", capcup: "⩇", capdot: "⩀", CapitalDifferentialD: "ⅅ", caps: "∩︀", caret: "⁁", caron: "ˇ", Cayleys: "ℭ", ccaps: "⩍", Ccaron: "Č", ccaron: "č", Ccedil: "Ç", ccedil: "ç", Ccirc: "Ĉ", ccirc: "ĉ", Cconint: "∰", ccups: "⩌", ccupssm: "⩐", Cdot: "Ċ", cdot: "ċ", cedil: "¸", Cedilla: "¸", cemptyv: "⦲", cent: "¢", centerdot: "·", CenterDot: "·", cfr: "𝔠", Cfr: "ℭ", CHcy: "Ч", chcy: "ч", check: "✓", checkmark: "✓", Chi: "Χ", chi: "χ", circ: "ˆ", circeq: "≗", circlearrowleft: "↺", circlearrowright: "↻", circledast: "⊛", circledcirc: "⊚", circleddash: "⊝", CircleDot: "⊙", circledR: "®", circledS: "Ⓢ", CircleMinus: "⊖", CirclePlus: "⊕", CircleTimes: "⊗", cir: "○", cirE: "⧃", cire: "≗", cirfnint: "⨐", cirmid: "⫯", cirscir: "⧂", ClockwiseContourIntegral: "∲", CloseCurlyDoubleQuote: "”", CloseCurlyQuote: "’", clubs: "♣", clubsuit: "♣", colon: ":", Colon: "∷", Colone: "⩴", colone: "≔", coloneq: "≔", comma: ",", commat: "@", comp: "∁", compfn: "∘", complement: "∁", complexes: "ℂ", cong: "≅", congdot: "⩭", Congruent: "≡", conint: "∮", Conint: "∯", ContourIntegral: "∮", copf: "𝕔", Copf: "ℂ", coprod: "∐", Coproduct: "∐", copy: "©", COPY: "©", copysr: "℗", CounterClockwiseContourIntegral: "∳", crarr: "↵", cross: "✗", Cross: "⨯", Cscr: "𝒞", cscr: "𝒸", csub: "⫏", csube: "⫑", csup: "⫐", csupe: "⫒", ctdot: "⋯", cudarrl: "⤸", cudarrr: "⤵", cuepr: "⋞", cuesc: "⋟", cularr: "↶", cularrp: "⤽", cupbrcap: "⩈", cupcap: "⩆", CupCap: "≍", cup: "∪", Cup: "⋓", cupcup: "⩊", cupdot: "⊍", cupor: "⩅", cups: "∪︀", curarr: "↷", curarrm: "⤼", curlyeqprec: "⋞", curlyeqsucc: "⋟", curlyvee: "⋎", curlywedge: "⋏", curren: "¤", curvearrowleft: "↶", curvearrowright: "↷", cuvee: "⋎", cuwed: "⋏", cwconint: "∲", cwint: "∱", cylcty: "⌭", dagger: "†", Dagger: "‡", daleth: "ℸ", darr: "↓", Darr: "↡", dArr: "⇓", dash: "‐", Dashv: "⫤", dashv: "⊣", dbkarow: "⤏", dblac: "˝", Dcaron: "Ď", dcaron: "ď", Dcy: "Д", dcy: "д", ddagger: "‡", ddarr: "⇊", DD: "ⅅ", dd: "ⅆ", DDotrahd: "⤑", ddotseq: "⩷", deg: "°", Del: "∇", Delta: "Δ", delta: "δ", demptyv: "⦱", dfisht: "⥿", Dfr: "𝔇", dfr: "𝔡", dHar: "⥥", dharl: "⇃", dharr: "⇂", DiacriticalAcute: "´", DiacriticalDot: "˙", DiacriticalDoubleAcute: "˝", DiacriticalGrave: "`", DiacriticalTilde: "˜", diam: "⋄", diamond: "⋄", Diamond: "⋄", diamondsuit: "♦", diams: "♦", die: "¨", DifferentialD: "ⅆ", digamma: "ϝ", disin: "⋲", div: "÷", divide: "÷", divideontimes: "⋇", divonx: "⋇", DJcy: "Ђ", djcy: "ђ", dlcorn: "⌞", dlcrop: "⌍", dollar: "$", Dopf: "𝔻", dopf: "𝕕", Dot: "¨", dot: "˙", DotDot: "⃜", doteq: "≐", doteqdot: "≑", DotEqual: "≐", dotminus: "∸", dotplus: "∔", dotsquare: "⊡", doublebarwedge: "⌆", DoubleContourIntegral: "∯", DoubleDot: "¨", DoubleDownArrow: "⇓", DoubleLeftArrow: "⇐", DoubleLeftRightArrow: "⇔", DoubleLeftTee: "⫤", DoubleLongLeftArrow: "⟸", DoubleLongLeftRightArrow: "⟺", DoubleLongRightArrow: "⟹", DoubleRightArrow: "⇒", DoubleRightTee: "⊨", DoubleUpArrow: "⇑", DoubleUpDownArrow: "⇕", DoubleVerticalBar: "∥", DownArrowBar: "⤓", downarrow: "↓", DownArrow: "↓", Downarrow: "⇓", DownArrowUpArrow: "⇵", DownBreve: "̑", downdownarrows: "⇊", downharpoonleft: "⇃", downharpoonright: "⇂", DownLeftRightVector: "⥐", DownLeftTeeVector: "⥞", DownLeftVectorBar: "⥖", DownLeftVector: "↽", DownRightTeeVector: "⥟", DownRightVectorBar: "⥗", DownRightVector: "⇁", DownTeeArrow: "↧", DownTee: "⊤", drbkarow: "⤐", drcorn: "⌟", drcrop: "⌌", Dscr: "𝒟", dscr: "𝒹", DScy: "Ѕ", dscy: "ѕ", dsol: "⧶", Dstrok: "Đ", dstrok: "đ", dtdot: "⋱", dtri: "▿", dtrif: "▾", duarr: "⇵", duhar: "⥯", dwangle: "⦦", DZcy: "Џ", dzcy: "џ", dzigrarr: "⟿", Eacute: "É", eacute: "é", easter: "⩮", Ecaron: "Ě", ecaron: "ě", Ecirc: "Ê", ecirc: "ê", ecir: "≖", ecolon: "≕", Ecy: "Э", ecy: "э", eDDot: "⩷", Edot: "Ė", edot: "ė", eDot: "≑", ee: "ⅇ", efDot: "≒", Efr: "𝔈", efr: "𝔢", eg: "⪚", Egrave: "È", egrave: "è", egs: "⪖", egsdot: "⪘", el: "⪙", Element: "∈", elinters: "⏧", ell: "ℓ", els: "⪕", elsdot: "⪗", Emacr: "Ē", emacr: "ē", empty: "∅", emptyset: "∅", EmptySmallSquare: "◻", emptyv: "∅", EmptyVerySmallSquare: "▫", emsp13: " ", emsp14: " ", emsp: " ", ENG: "Ŋ", eng: "ŋ", ensp: " ", Eogon: "Ę", eogon: "ę", Eopf: "𝔼", eopf: "𝕖", epar: "⋕", eparsl: "⧣", eplus: "⩱", epsi: "ε", Epsilon: "Ε", epsilon: "ε", epsiv: "ϵ", eqcirc: "≖", eqcolon: "≕", eqsim: "≂", eqslantgtr: "⪖", eqslantless: "⪕", Equal: "⩵", equals: "=", EqualTilde: "≂", equest: "≟", Equilibrium: "⇌", equiv: "≡", equivDD: "⩸", eqvparsl: "⧥", erarr: "⥱", erDot: "≓", escr: "ℯ", Escr: "ℰ", esdot: "≐", Esim: "⩳", esim: "≂", Eta: "Η", eta: "η", ETH: "Ð", eth: "ð", Euml: "Ë", euml: "ë", euro: "€", excl: "!", exist: "∃", Exists: "∃", expectation: "ℰ", exponentiale: "ⅇ", ExponentialE: "ⅇ", fallingdotseq: "≒", Fcy: "Ф", fcy: "ф", female: "♀", ffilig: "ﬃ", fflig: "ﬀ", ffllig: "ﬄ", Ffr: "𝔉", ffr: "𝔣", filig: "ﬁ", FilledSmallSquare: "◼", FilledVerySmallSquare: "▪", fjlig: "fj", flat: "♭", fllig: "ﬂ", fltns: "▱", fnof: "ƒ", Fopf: "𝔽", fopf: "𝕗", forall: "∀", ForAll: "∀", fork: "⋔", forkv: "⫙", Fouriertrf: "ℱ", fpartint: "⨍", frac12: "½", frac13: "⅓", frac14: "¼", frac15: "⅕", frac16: "⅙", frac18: "⅛", frac23: "⅔", frac25: "⅖", frac34: "¾", frac35: "⅗", frac38: "⅜", frac45: "⅘", frac56: "⅚", frac58: "⅝", frac78: "⅞", frasl: "⁄", frown: "⌢", fscr: "𝒻", Fscr: "ℱ", gacute: "ǵ", Gamma: "Γ", gamma: "γ", Gammad: "Ϝ", gammad: "ϝ", gap: "⪆", Gbreve: "Ğ", gbreve: "ğ", Gcedil: "Ģ", Gcirc: "Ĝ", gcirc: "ĝ", Gcy: "Г", gcy: "г", Gdot: "Ġ", gdot: "ġ", ge: "≥", gE: "≧", gEl: "⪌", gel: "⋛", geq: "≥", geqq: "≧", geqslant: "⩾", gescc: "⪩", ges: "⩾", gesdot: "⪀", gesdoto: "⪂", gesdotol: "⪄", gesl: "⋛︀", gesles: "⪔", Gfr: "𝔊", gfr: "𝔤", gg: "≫", Gg: "⋙", ggg: "⋙", gimel: "ℷ", GJcy: "Ѓ", gjcy: "ѓ", gla: "⪥", gl: "≷", glE: "⪒", glj: "⪤", gnap: "⪊", gnapprox: "⪊", gne: "⪈", gnE: "≩", gneq: "⪈", gneqq: "≩", gnsim: "⋧", Gopf: "𝔾", gopf: "𝕘", grave: "`", GreaterEqual: "≥", GreaterEqualLess: "⋛", GreaterFullEqual: "≧", GreaterGreater: "⪢", GreaterLess: "≷", GreaterSlantEqual: "⩾", GreaterTilde: "≳", Gscr: "𝒢", gscr: "ℊ", gsim: "≳", gsime: "⪎", gsiml: "⪐", gtcc: "⪧", gtcir: "⩺", gt: ">", GT: ">", Gt: "≫", gtdot: "⋗", gtlPar: "⦕", gtquest: "⩼", gtrapprox: "⪆", gtrarr: "⥸", gtrdot: "⋗", gtreqless: "⋛", gtreqqless: "⪌", gtrless: "≷", gtrsim: "≳", gvertneqq: "≩︀", gvnE: "≩︀", Hacek: "ˇ", hairsp: " ", half: "½", hamilt: "ℋ", HARDcy: "Ъ", hardcy: "ъ", harrcir: "⥈", harr: "↔", hArr: "⇔", harrw: "↭", Hat: "^", hbar: "ℏ", Hcirc: "Ĥ", hcirc: "ĥ", hearts: "♥", heartsuit: "♥", hellip: "…", hercon: "⊹", hfr: "𝔥", Hfr: "ℌ", HilbertSpace: "ℋ", hksearow: "⤥", hkswarow: "⤦", hoarr: "⇿", homtht: "∻", hookleftarrow: "↩", hookrightarrow: "↪", hopf: "𝕙", Hopf: "ℍ", horbar: "―", HorizontalLine: "─", hscr: "𝒽", Hscr: "ℋ", hslash: "ℏ", Hstrok: "Ħ", hstrok: "ħ", HumpDownHump: "≎", HumpEqual: "≏", hybull: "⁃", hyphen: "‐", Iacute: "Í", iacute: "í", ic: "\u2063", Icirc: "Î", icirc: "î", Icy: "И", icy: "и", Idot: "İ", IEcy: "Е", iecy: "е", iexcl: "¡", iff: "⇔", ifr: "𝔦", Ifr: "ℑ", Igrave: "Ì", igrave: "ì", ii: "ⅈ", iiiint: "⨌", iiint: "∭", iinfin: "⧜", iiota: "℩", IJlig: "Ĳ", ijlig: "ĳ", Imacr: "Ī", imacr: "ī", image: "ℑ", ImaginaryI: "ⅈ", imagline: "ℐ", imagpart: "ℑ", imath: "ı", Im: "ℑ", imof: "⊷", imped: "Ƶ", Implies: "⇒", incare: "℅", in: "∈", infin: "∞", infintie: "⧝", inodot: "ı", intcal: "⊺", int: "∫", Int: "∬", integers: "ℤ", Integral: "∫", intercal: "⊺", Intersection: "⋂", intlarhk: "⨗", intprod: "⨼", InvisibleComma: "\u2063", InvisibleTimes: "\u2062", IOcy: "Ё", iocy: "ё", Iogon: "Į", iogon: "į", Iopf: "𝕀", iopf: "𝕚", Iota: "Ι", iota: "ι", iprod: "⨼", iquest: "¿", iscr: "𝒾", Iscr: "ℐ", isin: "∈", isindot: "⋵", isinE: "⋹", isins: "⋴", isinsv: "⋳", isinv: "∈", it: "\u2062", Itilde: "Ĩ", itilde: "ĩ", Iukcy: "І", iukcy: "і", Iuml: "Ï", iuml: "ï", Jcirc: "Ĵ", jcirc: "ĵ", Jcy: "Й", jcy: "й", Jfr: "𝔍", jfr: "𝔧", jmath: "ȷ", Jopf: "𝕁", jopf: "𝕛", Jscr: "𝒥", jscr: "𝒿", Jsercy: "Ј", jsercy: "ј", Jukcy: "Є", jukcy: "є", Kappa: "Κ", kappa: "κ", kappav: "ϰ", Kcedil: "Ķ", kcedil: "ķ", Kcy: "К", kcy: "к", Kfr: "𝔎", kfr: "𝔨", kgreen: "ĸ", KHcy: "Х", khcy: "х", KJcy: "Ќ", kjcy: "ќ", Kopf: "𝕂", kopf: "𝕜", Kscr: "𝒦", kscr: "𝓀", lAarr: "⇚", Lacute: "Ĺ", lacute: "ĺ", laemptyv: "⦴", lagran: "ℒ", Lambda: "Λ", lambda: "λ", lang: "⟨", Lang: "⟪", langd: "⦑", langle: "⟨", lap: "⪅", Laplacetrf: "ℒ", laquo: "«", larrb: "⇤", larrbfs: "⤟", larr: "←", Larr: "↞", lArr: "⇐", larrfs: "⤝", larrhk: "↩", larrlp: "↫", larrpl: "⤹", larrsim: "⥳", larrtl: "↢", latail: "⤙", lAtail: "⤛", lat: "⪫", late: "⪭", lates: "⪭︀", lbarr: "⤌", lBarr: "⤎", lbbrk: "❲", lbrace: "{", lbrack: "[", lbrke: "⦋", lbrksld: "⦏", lbrkslu: "⦍", Lcaron: "Ľ", lcaron: "ľ", Lcedil: "Ļ", lcedil: "ļ", lceil: "⌈", lcub: "{", Lcy: "Л", lcy: "л", ldca: "⤶", ldquo: "“", ldquor: "„", ldrdhar: "⥧", ldrushar: "⥋", ldsh: "↲", le: "≤", lE: "≦", LeftAngleBracket: "⟨", LeftArrowBar: "⇤", leftarrow: "←", LeftArrow: "←", Leftarrow: "⇐", LeftArrowRightArrow: "⇆", leftarrowtail: "↢", LeftCeiling: "⌈", LeftDoubleBracket: "⟦", LeftDownTeeVector: "⥡", LeftDownVectorBar: "⥙", LeftDownVector: "⇃", LeftFloor: "⌊", leftharpoondown: "↽", leftharpoonup: "↼", leftleftarrows: "⇇", leftrightarrow: "↔", LeftRightArrow: "↔", Leftrightarrow: "⇔", leftrightarrows: "⇆", leftrightharpoons: "⇋", leftrightsquigarrow: "↭", LeftRightVector: "⥎", LeftTeeArrow: "↤", LeftTee: "⊣", LeftTeeVector: "⥚", leftthreetimes: "⋋", LeftTriangleBar: "⧏", LeftTriangle: "⊲", LeftTriangleEqual: "⊴", LeftUpDownVector: "⥑", LeftUpTeeVector: "⥠", LeftUpVectorBar: "⥘", LeftUpVector: "↿", LeftVectorBar: "⥒", LeftVector: "↼", lEg: "⪋", leg: "⋚", leq: "≤", leqq: "≦", leqslant: "⩽", lescc: "⪨", les: "⩽", lesdot: "⩿", lesdoto: "⪁", lesdotor: "⪃", lesg: "⋚︀", lesges: "⪓", lessapprox: "⪅", lessdot: "⋖", lesseqgtr: "⋚", lesseqqgtr: "⪋", LessEqualGreater: "⋚", LessFullEqual: "≦", LessGreater: "≶", lessgtr: "≶", LessLess: "⪡", lesssim: "≲", LessSlantEqual: "⩽", LessTilde: "≲", lfisht: "⥼", lfloor: "⌊", Lfr: "𝔏", lfr: "𝔩", lg: "≶", lgE: "⪑", lHar: "⥢", lhard: "↽", lharu: "↼", lharul: "⥪", lhblk: "▄", LJcy: "Љ", ljcy: "љ", llarr: "⇇", ll: "≪", Ll: "⋘", llcorner: "⌞", Lleftarrow: "⇚", llhard: "⥫", lltri: "◺", Lmidot: "Ŀ", lmidot: "ŀ", lmoustache: "⎰", lmoust: "⎰", lnap: "⪉", lnapprox: "⪉", lne: "⪇", lnE: "≨", lneq: "⪇", lneqq: "≨", lnsim: "⋦", loang: "⟬", loarr: "⇽", lobrk: "⟦", longleftarrow: "⟵", LongLeftArrow: "⟵", Longleftarrow: "⟸", longleftrightarrow: "⟷", LongLeftRightArrow: "⟷", Longleftrightarrow: "⟺", longmapsto: "⟼", longrightarrow: "⟶", LongRightArrow: "⟶", Longrightarrow: "⟹", looparrowleft: "↫", looparrowright: "↬", lopar: "⦅", Lopf: "𝕃", lopf: "𝕝", loplus: "⨭", lotimes: "⨴", lowast: "∗", lowbar: "_", LowerLeftArrow: "↙", LowerRightArrow: "↘", loz: "◊", lozenge: "◊", lozf: "⧫", lpar: "(", lparlt: "⦓", lrarr: "⇆", lrcorner: "⌟", lrhar: "⇋", lrhard: "⥭", lrm: "\u200E", lrtri: "⊿", lsaquo: "‹", lscr: "𝓁", Lscr: "ℒ", lsh: "↰", Lsh: "↰", lsim: "≲", lsime: "⪍", lsimg: "⪏", lsqb: "[", lsquo: "‘", lsquor: "‚", Lstrok: "Ł", lstrok: "ł", ltcc: "⪦", ltcir: "⩹", lt: "<", LT: "<", Lt: "≪", ltdot: "⋖", lthree: "⋋", ltimes: "⋉", ltlarr: "⥶", ltquest: "⩻", ltri: "◃", ltrie: "⊴", ltrif: "◂", ltrPar: "⦖", lurdshar: "⥊", luruhar: "⥦", lvertneqq: "≨︀", lvnE: "≨︀", macr: "¯", male: "♂", malt: "✠", maltese: "✠", Map: "⤅", map: "↦", mapsto: "↦", mapstodown: "↧", mapstoleft: "↤", mapstoup: "↥", marker: "▮", mcomma: "⨩", Mcy: "М", mcy: "м", mdash: "—", mDDot: "∺", measuredangle: "∡", MediumSpace: " ", Mellintrf: "ℳ", Mfr: "𝔐", mfr: "𝔪", mho: "℧", micro: "µ", midast: "*", midcir: "⫰", mid: "∣", middot: "·", minusb: "⊟", minus: "−", minusd: "∸", minusdu: "⨪", MinusPlus: "∓", mlcp: "⫛", mldr: "…", mnplus: "∓", models: "⊧", Mopf: "𝕄", mopf: "𝕞", mp: "∓", mscr: "𝓂", Mscr: "ℳ", mstpos: "∾", Mu: "Μ", mu: "μ", multimap: "⊸", mumap: "⊸", nabla: "∇", Nacute: "Ń", nacute: "ń", nang: "∠⃒", nap: "≉", napE: "⩰̸", napid: "≋̸", napos: "ŉ", napprox: "≉", natural: "♮", naturals: "ℕ", natur: "♮", nbsp: " ", nbump: "≎̸", nbumpe: "≏̸", ncap: "⩃", Ncaron: "Ň", ncaron: "ň", Ncedil: "Ņ", ncedil: "ņ", ncong: "≇", ncongdot: "⩭̸", ncup: "⩂", Ncy: "Н", ncy: "н", ndash: "–", nearhk: "⤤", nearr: "↗", neArr: "⇗", nearrow: "↗", ne: "≠", nedot: "≐̸", NegativeMediumSpace: "​", NegativeThickSpace: "​", NegativeThinSpace: "​", NegativeVeryThinSpace: "​", nequiv: "≢", nesear: "⤨", nesim: "≂̸", NestedGreaterGreater: "≫", NestedLessLess: "≪", NewLine: "\n", nexist: "∄", nexists: "∄", Nfr: "𝔑", nfr: "𝔫", ngE: "≧̸", nge: "≱", ngeq: "≱", ngeqq: "≧̸", ngeqslant: "⩾̸", nges: "⩾̸", nGg: "⋙̸", ngsim: "≵", nGt: "≫⃒", ngt: "≯", ngtr: "≯", nGtv: "≫̸", nharr: "↮", nhArr: "⇎", nhpar: "⫲", ni: "∋", nis: "⋼", nisd: "⋺", niv: "∋", NJcy: "Њ", njcy: "њ", nlarr: "↚", nlArr: "⇍", nldr: "‥", nlE: "≦̸", nle: "≰", nleftarrow: "↚", nLeftarrow: "⇍", nleftrightarrow: "↮", nLeftrightarrow: "⇎", nleq: "≰", nleqq: "≦̸", nleqslant: "⩽̸", nles: "⩽̸", nless: "≮", nLl: "⋘̸", nlsim: "≴", nLt: "≪⃒", nlt: "≮", nltri: "⋪", nltrie: "⋬", nLtv: "≪̸", nmid: "∤", NoBreak: "\u2060", NonBreakingSpace: " ", nopf: "𝕟", Nopf: "ℕ", Not: "⫬", not: "¬", NotCongruent: "≢", NotCupCap: "≭", NotDoubleVerticalBar: "∦", NotElement: "∉", NotEqual: "≠", NotEqualTilde: "≂̸", NotExists: "∄", NotGreater: "≯", NotGreaterEqual: "≱", NotGreaterFullEqual: "≧̸", NotGreaterGreater: "≫̸", NotGreaterLess: "≹", NotGreaterSlantEqual: "⩾̸", NotGreaterTilde: "≵", NotHumpDownHump: "≎̸", NotHumpEqual: "≏̸", notin: "∉", notindot: "⋵̸", notinE: "⋹̸", notinva: "∉", notinvb: "⋷", notinvc: "⋶", NotLeftTriangleBar: "⧏̸", NotLeftTriangle: "⋪", NotLeftTriangleEqual: "⋬", NotLess: "≮", NotLessEqual: "≰", NotLessGreater: "≸", NotLessLess: "≪̸", NotLessSlantEqual: "⩽̸", NotLessTilde: "≴", NotNestedGreaterGreater: "⪢̸", NotNestedLessLess: "⪡̸", notni: "∌", notniva: "∌", notnivb: "⋾", notnivc: "⋽", NotPrecedes: "⊀", NotPrecedesEqual: "⪯̸", NotPrecedesSlantEqual: "⋠", NotReverseElement: "∌", NotRightTriangleBar: "⧐̸", NotRightTriangle: "⋫", NotRightTriangleEqual: "⋭", NotSquareSubset: "⊏̸", NotSquareSubsetEqual: "⋢", NotSquareSuperset: "⊐̸", NotSquareSupersetEqual: "⋣", NotSubset: "⊂⃒", NotSubsetEqual: "⊈", NotSucceeds: "⊁", NotSucceedsEqual: "⪰̸", NotSucceedsSlantEqual: "⋡", NotSucceedsTilde: "≿̸", NotSuperset: "⊃⃒", NotSupersetEqual: "⊉", NotTilde: "≁", NotTildeEqual: "≄", NotTildeFullEqual: "≇", NotTildeTilde: "≉", NotVerticalBar: "∤", nparallel: "∦", npar: "∦", nparsl: "⫽⃥", npart: "∂̸", npolint: "⨔", npr: "⊀", nprcue: "⋠", nprec: "⊀", npreceq: "⪯̸", npre: "⪯̸", nrarrc: "⤳̸", nrarr: "↛", nrArr: "⇏", nrarrw: "↝̸", nrightarrow: "↛", nRightarrow: "⇏", nrtri: "⋫", nrtrie: "⋭", nsc: "⊁", nsccue: "⋡", nsce: "⪰̸", Nscr: "𝒩", nscr: "𝓃", nshortmid: "∤", nshortparallel: "∦", nsim: "≁", nsime: "≄", nsimeq: "≄", nsmid: "∤", nspar: "∦", nsqsube: "⋢", nsqsupe: "⋣", nsub: "⊄", nsubE: "⫅̸", nsube: "⊈", nsubset: "⊂⃒", nsubseteq: "⊈", nsubseteqq: "⫅̸", nsucc: "⊁", nsucceq: "⪰̸", nsup: "⊅", nsupE: "⫆̸", nsupe: "⊉", nsupset: "⊃⃒", nsupseteq: "⊉", nsupseteqq: "⫆̸", ntgl: "≹", Ntilde: "Ñ", ntilde: "ñ", ntlg: "≸", ntriangleleft: "⋪", ntrianglelefteq: "⋬", ntriangleright: "⋫", ntrianglerighteq: "⋭", Nu: "Ν", nu: "ν", num: "#", numero: "№", numsp: " ", nvap: "≍⃒", nvdash: "⊬", nvDash: "⊭", nVdash: "⊮", nVDash: "⊯", nvge: "≥⃒", nvgt: ">⃒", nvHarr: "⤄", nvinfin: "⧞", nvlArr: "⤂", nvle: "≤⃒", nvlt: "<⃒", nvltrie: "⊴⃒", nvrArr: "⤃", nvrtrie: "⊵⃒", nvsim: "∼⃒", nwarhk: "⤣", nwarr: "↖", nwArr: "⇖", nwarrow: "↖", nwnear: "⤧", Oacute: "Ó", oacute: "ó", oast: "⊛", Ocirc: "Ô", ocirc: "ô", ocir: "⊚", Ocy: "О", ocy: "о", odash: "⊝", Odblac: "Ő", odblac: "ő", odiv: "⨸", odot: "⊙", odsold: "⦼", OElig: "Œ", oelig: "œ", ofcir: "⦿", Ofr: "𝔒", ofr: "𝔬", ogon: "˛", Ograve: "Ò", ograve: "ò", ogt: "⧁", ohbar: "⦵", ohm: "Ω", oint: "∮", olarr: "↺", olcir: "⦾", olcross: "⦻", oline: "‾", olt: "⧀", Omacr: "Ō", omacr: "ō", Omega: "Ω", omega: "ω", Omicron: "Ο", omicron: "ο", omid: "⦶", ominus: "⊖", Oopf: "𝕆", oopf: "𝕠", opar: "⦷", OpenCurlyDoubleQuote: "“", OpenCurlyQuote: "‘", operp: "⦹", oplus: "⊕", orarr: "↻", Or: "⩔", or: "∨", ord: "⩝", order: "ℴ", orderof: "ℴ", ordf: "ª", ordm: "º", origof: "⊶", oror: "⩖", orslope: "⩗", orv: "⩛", oS: "Ⓢ", Oscr: "𝒪", oscr: "ℴ", Oslash: "Ø", oslash: "ø", osol: "⊘", Otilde: "Õ", otilde: "õ", otimesas: "⨶", Otimes: "⨷", otimes: "⊗", Ouml: "Ö", ouml: "ö", ovbar: "⌽", OverBar: "‾", OverBrace: "⏞", OverBracket: "⎴", OverParenthesis: "⏜", para: "¶", parallel: "∥", par: "∥", parsim: "⫳", parsl: "⫽", part: "∂", PartialD: "∂", Pcy: "П", pcy: "п", percnt: "%", period: ".", permil: "‰", perp: "⊥", pertenk: "‱", Pfr: "𝔓", pfr: "𝔭", Phi: "Φ", phi: "φ", phiv: "ϕ", phmmat: "ℳ", phone: "☎", Pi: "Π", pi: "π", pitchfork: "⋔", piv: "ϖ", planck: "ℏ", planckh: "ℎ", plankv: "ℏ", plusacir: "⨣", plusb: "⊞", pluscir: "⨢", plus: "+", plusdo: "∔", plusdu: "⨥", pluse: "⩲", PlusMinus: "±", plusmn: "±", plussim: "⨦", plustwo: "⨧", pm: "±", Poincareplane: "ℌ", pointint: "⨕", popf: "𝕡", Popf: "ℙ", pound: "£", prap: "⪷", Pr: "⪻", pr: "≺", prcue: "≼", precapprox: "⪷", prec: "≺", preccurlyeq: "≼", Precedes: "≺", PrecedesEqual: "⪯", PrecedesSlantEqual: "≼", PrecedesTilde: "≾", preceq: "⪯", precnapprox: "⪹", precneqq: "⪵", precnsim: "⋨", pre: "⪯", prE: "⪳", precsim: "≾", prime: "′", Prime: "″", primes: "ℙ", prnap: "⪹", prnE: "⪵", prnsim: "⋨", prod: "∏", Product: "∏", profalar: "⌮", profline: "⌒", profsurf: "⌓", prop: "∝", Proportional: "∝", Proportion: "∷", propto: "∝", prsim: "≾", prurel: "⊰", Pscr: "𝒫", pscr: "𝓅", Psi: "Ψ", psi: "ψ", puncsp: " ", Qfr: "𝔔", qfr: "𝔮", qint: "⨌", qopf: "𝕢", Qopf: "ℚ", qprime: "⁗", Qscr: "𝒬", qscr: "𝓆", quaternions: "ℍ", quatint: "⨖", quest: "?", questeq: "≟", quot: "\"", QUOT: "\"", rAarr: "⇛", race: "∽̱", Racute: "Ŕ", racute: "ŕ", radic: "√", raemptyv: "⦳", rang: "⟩", Rang: "⟫", rangd: "⦒", range: "⦥", rangle: "⟩", raquo: "»", rarrap: "⥵", rarrb: "⇥", rarrbfs: "⤠", rarrc: "⤳", rarr: "→", Rarr: "↠", rArr: "⇒", rarrfs: "⤞", rarrhk: "↪", rarrlp: "↬", rarrpl: "⥅", rarrsim: "⥴", Rarrtl: "⤖", rarrtl: "↣", rarrw: "↝", ratail: "⤚", rAtail: "⤜", ratio: "∶", rationals: "ℚ", rbarr: "⤍", rBarr: "⤏", RBarr: "⤐", rbbrk: "❳", rbrace: "}", rbrack: "]", rbrke: "⦌", rbrksld: "⦎", rbrkslu: "⦐", Rcaron: "Ř", rcaron: "ř", Rcedil: "Ŗ", rcedil: "ŗ", rceil: "⌉", rcub: "}", Rcy: "Р", rcy: "р", rdca: "⤷", rdldhar: "⥩", rdquo: "”", rdquor: "”", rdsh: "↳", real: "ℜ", realine: "ℛ", realpart: "ℜ", reals: "ℝ", Re: "ℜ", rect: "▭", reg: "®", REG: "®", ReverseElement: "∋", ReverseEquilibrium: "⇋", ReverseUpEquilibrium: "⥯", rfisht: "⥽", rfloor: "⌋", rfr: "𝔯", Rfr: "ℜ", rHar: "⥤", rhard: "⇁", rharu: "⇀", rharul: "⥬", Rho: "Ρ", rho: "ρ", rhov: "ϱ", RightAngleBracket: "⟩", RightArrowBar: "⇥", rightarrow: "→", RightArrow: "→", Rightarrow: "⇒", RightArrowLeftArrow: "⇄", rightarrowtail: "↣", RightCeiling: "⌉", RightDoubleBracket: "⟧", RightDownTeeVector: "⥝", RightDownVectorBar: "⥕", RightDownVector: "⇂", RightFloor: "⌋", rightharpoondown: "⇁", rightharpoonup: "⇀", rightleftarrows: "⇄", rightleftharpoons: "⇌", rightrightarrows: "⇉", rightsquigarrow: "↝", RightTeeArrow: "↦", RightTee: "⊢", RightTeeVector: "⥛", rightthreetimes: "⋌", RightTriangleBar: "⧐", RightTriangle: "⊳", RightTriangleEqual: "⊵", RightUpDownVector: "⥏", RightUpTeeVector: "⥜", RightUpVectorBar: "⥔", RightUpVector: "↾", RightVectorBar: "⥓", RightVector: "⇀", ring: "˚", risingdotseq: "≓", rlarr: "⇄", rlhar: "⇌", rlm: "\u200F", rmoustache: "⎱", rmoust: "⎱", rnmid: "⫮", roang: "⟭", roarr: "⇾", robrk: "⟧", ropar: "⦆", ropf: "𝕣", Ropf: "ℝ", roplus: "⨮", rotimes: "⨵", RoundImplies: "⥰", rpar: ")", rpargt: "⦔", rppolint: "⨒", rrarr: "⇉", Rrightarrow: "⇛", rsaquo: "›", rscr: "𝓇", Rscr: "ℛ", rsh: "↱", Rsh: "↱", rsqb: "]", rsquo: "’", rsquor: "’", rthree: "⋌", rtimes: "⋊", rtri: "▹", rtrie: "⊵", rtrif: "▸", rtriltri: "⧎", RuleDelayed: "⧴", ruluhar: "⥨", rx: "℞", Sacute: "Ś", sacute: "ś", sbquo: "‚", scap: "⪸", Scaron: "Š", scaron: "š", Sc: "⪼", sc: "≻", sccue: "≽", sce: "⪰", scE: "⪴", Scedil: "Ş", scedil: "ş", Scirc: "Ŝ", scirc: "ŝ", scnap: "⪺", scnE: "⪶", scnsim: "⋩", scpolint: "⨓", scsim: "≿", Scy: "С", scy: "с", sdotb: "⊡", sdot: "⋅", sdote: "⩦", searhk: "⤥", searr: "↘", seArr: "⇘", searrow: "↘", sect: "§", semi: ";", seswar: "⤩", setminus: "∖", setmn: "∖", sext: "✶", Sfr: "𝔖", sfr: "𝔰", sfrown: "⌢", sharp: "♯", SHCHcy: "Щ", shchcy: "щ", SHcy: "Ш", shcy: "ш", ShortDownArrow: "↓", ShortLeftArrow: "←", shortmid: "∣", shortparallel: "∥", ShortRightArrow: "→", ShortUpArrow: "↑", shy: "\xAD", Sigma: "Σ", sigma: "σ", sigmaf: "ς", sigmav: "ς", sim: "∼", simdot: "⩪", sime: "≃", simeq: "≃", simg: "⪞", simgE: "⪠", siml: "⪝", simlE: "⪟", simne: "≆", simplus: "⨤", simrarr: "⥲", slarr: "←", SmallCircle: "∘", smallsetminus: "∖", smashp: "⨳", smeparsl: "⧤", smid: "∣", smile: "⌣", smt: "⪪", smte: "⪬", smtes: "⪬︀", SOFTcy: "Ь", softcy: "ь", solbar: "⌿", solb: "⧄", sol: "/", Sopf: "𝕊", sopf: "𝕤", spades: "♠", spadesuit: "♠", spar: "∥", sqcap: "⊓", sqcaps: "⊓︀", sqcup: "⊔", sqcups: "⊔︀", Sqrt: "√", sqsub: "⊏", sqsube: "⊑", sqsubset: "⊏", sqsubseteq: "⊑", sqsup: "⊐", sqsupe: "⊒", sqsupset: "⊐", sqsupseteq: "⊒", square: "□", Square: "□", SquareIntersection: "⊓", SquareSubset: "⊏", SquareSubsetEqual: "⊑", SquareSuperset: "⊐", SquareSupersetEqual: "⊒", SquareUnion: "⊔", squarf: "▪", squ: "□", squf: "▪", srarr: "→", Sscr: "𝒮", sscr: "𝓈", ssetmn: "∖", ssmile: "⌣", sstarf: "⋆", Star: "⋆", star: "☆", starf: "★", straightepsilon: "ϵ", straightphi: "ϕ", strns: "¯", sub: "⊂", Sub: "⋐", subdot: "⪽", subE: "⫅", sube: "⊆", subedot: "⫃", submult: "⫁", subnE: "⫋", subne: "⊊", subplus: "⪿", subrarr: "⥹", subset: "⊂", Subset: "⋐", subseteq: "⊆", subseteqq: "⫅", SubsetEqual: "⊆", subsetneq: "⊊", subsetneqq: "⫋", subsim: "⫇", subsub: "⫕", subsup: "⫓", succapprox: "⪸", succ: "≻", succcurlyeq: "≽", Succeeds: "≻", SucceedsEqual: "⪰", SucceedsSlantEqual: "≽", SucceedsTilde: "≿", succeq: "⪰", succnapprox: "⪺", succneqq: "⪶", succnsim: "⋩", succsim: "≿", SuchThat: "∋", sum: "∑", Sum: "∑", sung: "♪", sup1: "¹", sup2: "²", sup3: "³", sup: "⊃", Sup: "⋑", supdot: "⪾", supdsub: "⫘", supE: "⫆", supe: "⊇", supedot: "⫄", Superset: "⊃", SupersetEqual: "⊇", suphsol: "⟉", suphsub: "⫗", suplarr: "⥻", supmult: "⫂", supnE: "⫌", supne: "⊋", supplus: "⫀", supset: "⊃", Supset: "⋑", supseteq: "⊇", supseteqq: "⫆", supsetneq: "⊋", supsetneqq: "⫌", supsim: "⫈", supsub: "⫔", supsup: "⫖", swarhk: "⤦", swarr: "↙", swArr: "⇙", swarrow: "↙", swnwar: "⤪", szlig: "ß", Tab: "\t", target: "⌖", Tau: "Τ", tau: "τ", tbrk: "⎴", Tcaron: "Ť", tcaron: "ť", Tcedil: "Ţ", tcedil: "ţ", Tcy: "Т", tcy: "т", tdot: "⃛", telrec: "⌕", Tfr: "𝔗", tfr: "𝔱", there4: "∴", therefore: "∴", Therefore: "∴", Theta: "Θ", theta: "θ", thetasym: "ϑ", thetav: "ϑ", thickapprox: "≈", thicksim: "∼", ThickSpace: "  ", ThinSpace: " ", thinsp: " ", thkap: "≈", thksim: "∼", THORN: "Þ", thorn: "þ", tilde: "˜", Tilde: "∼", TildeEqual: "≃", TildeFullEqual: "≅", TildeTilde: "≈", timesbar: "⨱", timesb: "⊠", times: "×", timesd: "⨰", tint: "∭", toea: "⤨", topbot: "⌶", topcir: "⫱", top: "⊤", Topf: "𝕋", topf: "𝕥", topfork: "⫚", tosa: "⤩", tprime: "‴", trade: "™", TRADE: "™", triangle: "▵", triangledown: "▿", triangleleft: "◃", trianglelefteq: "⊴", triangleq: "≜", triangleright: "▹", trianglerighteq: "⊵", tridot: "◬", trie: "≜", triminus: "⨺", TripleDot: "⃛", triplus: "⨹", trisb: "⧍", tritime: "⨻", trpezium: "⏢", Tscr: "𝒯", tscr: "𝓉", TScy: "Ц", tscy: "ц", TSHcy: "Ћ", tshcy: "ћ", Tstrok: "Ŧ", tstrok: "ŧ", twixt: "≬", twoheadleftarrow: "↞", twoheadrightarrow: "↠", Uacute: "Ú", uacute: "ú", uarr: "↑", Uarr: "↟", uArr: "⇑", Uarrocir: "⥉", Ubrcy: "Ў", ubrcy: "ў", Ubreve: "Ŭ", ubreve: "ŭ", Ucirc: "Û", ucirc: "û", Ucy: "У", ucy: "у", udarr: "⇅", Udblac: "Ű", udblac: "ű", udhar: "⥮", ufisht: "⥾", Ufr: "𝔘", ufr: "𝔲", Ugrave: "Ù", ugrave: "ù", uHar: "⥣", uharl: "↿", uharr: "↾", uhblk: "▀", ulcorn: "⌜", ulcorner: "⌜", ulcrop: "⌏", ultri: "◸", Umacr: "Ū", umacr: "ū", uml: "¨", UnderBar: "_", UnderBrace: "⏟", UnderBracket: "⎵", UnderParenthesis: "⏝", Union: "⋃", UnionPlus: "⊎", Uogon: "Ų", uogon: "ų", Uopf: "𝕌", uopf: "𝕦", UpArrowBar: "⤒", uparrow: "↑", UpArrow: "↑", Uparrow: "⇑", UpArrowDownArrow: "⇅", updownarrow: "↕", UpDownArrow: "↕", Updownarrow: "⇕", UpEquilibrium: "⥮", upharpoonleft: "↿", upharpoonright: "↾", uplus: "⊎", UpperLeftArrow: "↖", UpperRightArrow: "↗", upsi: "υ", Upsi: "ϒ", upsih: "ϒ", Upsilon: "Υ", upsilon: "υ", UpTeeArrow: "↥", UpTee: "⊥", upuparrows: "⇈", urcorn: "⌝", urcorner: "⌝", urcrop: "⌎", Uring: "Ů", uring: "ů", urtri: "◹", Uscr: "𝒰", uscr: "𝓊", utdot: "⋰", Utilde: "Ũ", utilde: "ũ", utri: "▵", utrif: "▴", uuarr: "⇈", Uuml: "Ü", uuml: "ü", uwangle: "⦧", vangrt: "⦜", varepsilon: "ϵ", varkappa: "ϰ", varnothing: "∅", varphi: "ϕ", varpi: "ϖ", varpropto: "∝", varr: "↕", vArr: "⇕", varrho: "ϱ", varsigma: "ς", varsubsetneq: "⊊︀", varsubsetneqq: "⫋︀", varsupsetneq: "⊋︀", varsupsetneqq: "⫌︀", vartheta: "ϑ", vartriangleleft: "⊲", vartriangleright: "⊳", vBar: "⫨", Vbar: "⫫", vBarv: "⫩", Vcy: "В", vcy: "в", vdash: "⊢", vDash: "⊨", Vdash: "⊩", VDash: "⊫", Vdashl: "⫦", veebar: "⊻", vee: "∨", Vee: "⋁", veeeq: "≚", vellip: "⋮", verbar: "|", Verbar: "‖", vert: "|", Vert: "‖", VerticalBar: "∣", VerticalLine: "|", VerticalSeparator: "❘", VerticalTilde: "≀", VeryThinSpace: " ", Vfr: "𝔙", vfr: "𝔳", vltri: "⊲", vnsub: "⊂⃒", vnsup: "⊃⃒", Vopf: "𝕍", vopf: "𝕧", vprop: "∝", vrtri: "⊳", Vscr: "𝒱", vscr: "𝓋", vsubnE: "⫋︀", vsubne: "⊊︀", vsupnE: "⫌︀", vsupne: "⊋︀", Vvdash: "⊪", vzigzag: "⦚", Wcirc: "Ŵ", wcirc: "ŵ", wedbar: "⩟", wedge: "∧", Wedge: "⋀", wedgeq: "≙", weierp: "℘", Wfr: "𝔚", wfr: "𝔴", Wopf: "𝕎", wopf: "𝕨", wp: "℘", wr: "≀", wreath: "≀", Wscr: "𝒲", wscr: "𝓌", xcap: "⋂", xcirc: "◯", xcup: "⋃", xdtri: "▽", Xfr: "𝔛", xfr: "𝔵", xharr: "⟷", xhArr: "⟺", Xi: "Ξ", xi: "ξ", xlarr: "⟵", xlArr: "⟸", xmap: "⟼", xnis: "⋻", xodot: "⨀", Xopf: "𝕏", xopf: "𝕩", xoplus: "⨁", xotime: "⨂", xrarr: "⟶", xrArr: "⟹", Xscr: "𝒳", xscr: "𝓍", xsqcup: "⨆", xuplus: "⨄", xutri: "△", xvee: "⋁", xwedge: "⋀", Yacute: "Ý", yacute: "ý", YAcy: "Я", yacy: "я", Ycirc: "Ŷ", ycirc: "ŷ", Ycy: "Ы", ycy: "ы", yen: "¥", Yfr: "𝔜", yfr: "𝔶", YIcy: "Ї", yicy: "ї", Yopf: "𝕐", yopf: "𝕪", Yscr: "𝒴", yscr: "𝓎", YUcy: "Ю", yucy: "ю", yuml: "ÿ", Yuml: "Ÿ", Zacute: "Ź", zacute: "ź", Zcaron: "Ž", zcaron: "ž", Zcy: "З", zcy: "з", Zdot: "Ż", zdot: "ż", zeetrf: "ℨ", ZeroWidthSpace: "​", Zeta: "Ζ", zeta: "ζ", zfr: "𝔷", Zfr: "ℨ", ZHcy: "Ж", zhcy: "ж", zigrarr: "⇝", zopf: "𝕫", Zopf: "ℤ", Zscr: "𝒵", zscr: "𝓏", zwj: "\u200D", zwnj: "\u200C"
    };

    var HEXCHARCODE = /^#[xX]([A-Fa-f0-9]+)$/;
    var CHARCODE = /^#([0-9]+)$/;
    var NAMED = /^([A-Za-z0-9]+)$/;
    var EntityParser = /** @class */function () {
        function EntityParser(named) {
            this.named = named;
        }
        EntityParser.prototype.parse = function (entity) {
            if (!entity) {
                return;
            }
            var matches = entity.match(HEXCHARCODE);
            if (matches) {
                return String.fromCharCode(parseInt(matches[1], 16));
            }
            matches = entity.match(CHARCODE);
            if (matches) {
                return String.fromCharCode(parseInt(matches[1], 10));
            }
            matches = entity.match(NAMED);
            if (matches) {
                return this.named[matches[1]];
            }
        };
        return EntityParser;
    }();

    var WSP = /[\t\n\f ]/;
    var ALPHA = /[A-Za-z]/;
    var CRLF = /\r\n?/g;
    function isSpace(char) {
        return WSP.test(char);
    }
    function isAlpha(char) {
        return ALPHA.test(char);
    }
    function preprocessInput(input) {
        return input.replace(CRLF, '\n');
    }

    var EventedTokenizer = /** @class */function () {
        function EventedTokenizer(delegate, entityParser) {
            this.delegate = delegate;
            this.entityParser = entityParser;
            this.state = "beforeData" /* beforeData */;
            this.line = -1;
            this.column = -1;
            this.input = '';
            this.index = -1;
            this.tagNameBuffer = '';
            this.states = {
                beforeData: function () {
                    var char = this.peek(),
                        tag;
                    if (char === '<') {
                        this.transitionTo("tagOpen" /* tagOpen */);
                        this.markTagStart();
                        this.consume();
                    } else {
                        if (char === '\n') {
                            tag = this.tagNameBuffer.toLowerCase();

                            if (tag === 'pre' || tag === 'textarea') {
                                this.consume();
                            }
                        }
                        this.transitionTo("data" /* data */);
                        this.delegate.beginData();
                    }
                },
                data: function () {
                    var char = this.peek();
                    if (char === '<') {
                        this.delegate.finishData();
                        this.transitionTo("tagOpen" /* tagOpen */);
                        this.markTagStart();
                        this.consume();
                    } else if (char === '&') {
                        this.consume();
                        this.delegate.appendToData(this.consumeCharRef() || '&');
                    } else {
                        this.consume();
                        this.delegate.appendToData(char);
                    }
                },
                tagOpen: function () {
                    var char = this.consume();
                    if (char === '!') {
                        this.transitionTo("markupDeclarationOpen" /* markupDeclarationOpen */);
                    } else if (char === '/') {
                        this.transitionTo("endTagOpen" /* endTagOpen */);
                    } else if (isAlpha(char)) {
                        this.transitionTo("tagName" /* tagName */);
                        this.tagNameBuffer = '';
                        this.delegate.beginStartTag();
                        this.appendToTagName(char);
                    }
                },
                markupDeclarationOpen: function () {
                    var char = this.consume();
                    if (char === '-' && this.input.charAt(this.index) === '-') {
                        this.consume();
                        this.transitionTo("commentStart" /* commentStart */);
                        this.delegate.beginComment();
                    }
                },
                commentStart: function () {
                    var char = this.consume();
                    if (char === '-') {
                        this.transitionTo("commentStartDash" /* commentStartDash */);
                    } else if (char === '>') {
                        this.delegate.finishComment();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.delegate.appendToCommentData(char);
                        this.transitionTo("comment" /* comment */);
                    }
                },
                commentStartDash: function () {
                    var char = this.consume();
                    if (char === '-') {
                        this.transitionTo("commentEnd" /* commentEnd */);
                    } else if (char === '>') {
                        this.delegate.finishComment();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.delegate.appendToCommentData('-');
                        this.transitionTo("comment" /* comment */);
                    }
                },
                comment: function () {
                    var char = this.consume();
                    if (char === '-') {
                        this.transitionTo("commentEndDash" /* commentEndDash */);
                    } else {
                        this.delegate.appendToCommentData(char);
                    }
                },
                commentEndDash: function () {
                    var char = this.consume();
                    if (char === '-') {
                        this.transitionTo("commentEnd" /* commentEnd */);
                    } else {
                        this.delegate.appendToCommentData('-' + char);
                        this.transitionTo("comment" /* comment */);
                    }
                },
                commentEnd: function () {
                    var char = this.consume();
                    if (char === '>') {
                        this.delegate.finishComment();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.delegate.appendToCommentData('--' + char);
                        this.transitionTo("comment" /* comment */);
                    }
                },
                tagName: function () {
                    var char = this.consume();
                    if (isSpace(char)) {
                        this.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    } else if (char === '/') {
                        this.transitionTo("selfClosingStartTag" /* selfClosingStartTag */);
                    } else if (char === '>') {
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.appendToTagName(char);
                    }
                },
                beforeAttributeName: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                    } else if (char === '/') {
                        this.transitionTo("selfClosingStartTag" /* selfClosingStartTag */);
                        this.consume();
                    } else if (char === '>') {
                        this.consume();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else if (char === '=') {
                        this.delegate.reportSyntaxError('attribute name cannot start with equals sign');
                        this.transitionTo("attributeName" /* attributeName */);
                        this.delegate.beginAttribute();
                        this.consume();
                        this.delegate.appendToAttributeName(char);
                    } else {
                        this.transitionTo("attributeName" /* attributeName */);
                        this.delegate.beginAttribute();
                    }
                },
                attributeName: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.transitionTo("afterAttributeName" /* afterAttributeName */);
                        this.consume();
                    } else if (char === '/') {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.transitionTo("selfClosingStartTag" /* selfClosingStartTag */);
                    } else if (char === '=') {
                        this.transitionTo("beforeAttributeValue" /* beforeAttributeValue */);
                        this.consume();
                    } else if (char === '>') {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else if (char === '"' || char === "'" || char === '<') {
                        this.delegate.reportSyntaxError(char + ' is not a valid character within attribute names');
                        this.consume();
                        this.delegate.appendToAttributeName(char);
                    } else {
                        this.consume();
                        this.delegate.appendToAttributeName(char);
                    }
                },
                afterAttributeName: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                    } else if (char === '/') {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.transitionTo("selfClosingStartTag" /* selfClosingStartTag */);
                    } else if (char === '=') {
                        this.consume();
                        this.transitionTo("beforeAttributeValue" /* beforeAttributeValue */);
                    } else if (char === '>') {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.transitionTo("attributeName" /* attributeName */);
                        this.delegate.beginAttribute();
                        this.delegate.appendToAttributeName(char);
                    }
                },
                beforeAttributeValue: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                    } else if (char === '"') {
                        this.transitionTo("attributeValueDoubleQuoted" /* attributeValueDoubleQuoted */);
                        this.delegate.beginAttributeValue(true);
                        this.consume();
                    } else if (char === "'") {
                        this.transitionTo("attributeValueSingleQuoted" /* attributeValueSingleQuoted */);
                        this.delegate.beginAttributeValue(true);
                        this.consume();
                    } else if (char === '>') {
                        this.delegate.beginAttributeValue(false);
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.transitionTo("attributeValueUnquoted" /* attributeValueUnquoted */);
                        this.delegate.beginAttributeValue(false);
                        this.consume();
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                attributeValueDoubleQuoted: function () {
                    var char = this.consume();
                    if (char === '"') {
                        this.delegate.finishAttributeValue();
                        this.transitionTo("afterAttributeValueQuoted" /* afterAttributeValueQuoted */);
                    } else if (char === '&') {
                        this.delegate.appendToAttributeValue(this.consumeCharRef() || '&');
                    } else {
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                attributeValueSingleQuoted: function () {
                    var char = this.consume();
                    if (char === "'") {
                        this.delegate.finishAttributeValue();
                        this.transitionTo("afterAttributeValueQuoted" /* afterAttributeValueQuoted */);
                    } else if (char === '&') {
                        this.delegate.appendToAttributeValue(this.consumeCharRef() || '&');
                    } else {
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                attributeValueUnquoted: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    } else if (char === '&') {
                        this.consume();
                        this.delegate.appendToAttributeValue(this.consumeCharRef() || '&');
                    } else if (char === '>') {
                        this.delegate.finishAttributeValue();
                        this.consume();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.consume();
                        this.delegate.appendToAttributeValue(char);
                    }
                },
                afterAttributeValueQuoted: function () {
                    var char = this.peek();
                    if (isSpace(char)) {
                        this.consume();
                        this.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    } else if (char === '/') {
                        this.consume();
                        this.transitionTo("selfClosingStartTag" /* selfClosingStartTag */);
                    } else if (char === '>') {
                        this.consume();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    }
                },
                selfClosingStartTag: function () {
                    var char = this.peek();
                    if (char === '>') {
                        this.consume();
                        this.delegate.markTagAsSelfClosing();
                        this.delegate.finishTag();
                        this.transitionTo("beforeData" /* beforeData */);
                    } else {
                        this.transitionTo("beforeAttributeName" /* beforeAttributeName */);
                    }
                },
                endTagOpen: function () {
                    var char = this.consume();
                    if (isAlpha(char)) {
                        this.transitionTo("tagName" /* tagName */);
                        this.tagNameBuffer = '';
                        this.delegate.beginEndTag();
                        this.appendToTagName(char);
                    }
                }
            };
            this.reset();
        }
        EventedTokenizer.prototype.reset = function () {
            this.transitionTo("beforeData" /* beforeData */);
            this.input = '';
            this.index = 0;
            this.line = 1;
            this.column = 0;
            this.delegate.reset();
        };
        EventedTokenizer.prototype.transitionTo = function (state) {
            this.state = state;
        };
        EventedTokenizer.prototype.tokenize = function (input) {
            this.reset();
            this.tokenizePart(input);
            this.tokenizeEOF();
        };
        EventedTokenizer.prototype.tokenizePart = function (input) {
            var handler;

            this.input += preprocessInput(input);
            while (this.index < this.input.length) {
                handler = this.states[this.state];

                if (handler !== undefined) {
                    handler.call(this);
                } else {
                    throw new Error("unhandled state " + this.state);
                }
            }
        };
        EventedTokenizer.prototype.tokenizeEOF = function () {
            this.flushData();
        };
        EventedTokenizer.prototype.flushData = function () {
            if (this.state === 'data') {
                this.delegate.finishData();
                this.transitionTo("beforeData" /* beforeData */);
            }
        };
        EventedTokenizer.prototype.peek = function () {
            return this.input.charAt(this.index);
        };
        EventedTokenizer.prototype.consume = function () {
            var char = this.peek();
            this.index++;
            if (char === '\n') {
                this.line++;
                this.column = 0;
            } else {
                this.column++;
            }
            return char;
        };
        EventedTokenizer.prototype.consumeCharRef = function () {
            var endIndex = this.input.indexOf(';', this.index),
                count;
            if (endIndex === -1) {
                return;
            }
            var entity = this.input.slice(this.index, endIndex);
            var chars = this.entityParser.parse(entity);
            if (chars) {
                count = entity.length;
                // consume the entity chars

                while (count) {
                    this.consume();
                    count--;
                }
                // consume the `;`
                this.consume();
                return chars;
            }
        };
        EventedTokenizer.prototype.markTagStart = function () {
            this.delegate.tagOpen();
        };
        EventedTokenizer.prototype.appendToTagName = function (char) {
            this.tagNameBuffer += char;
            this.delegate.appendToTagName(char);
        };
        return EventedTokenizer;
    }();

    var Tokenizer = /** @class */function () {
        function Tokenizer(entityParser, options) {
            if (options === void 0) {
                options = {};
            }
            this.options = options;
            this.token = null;
            this.startLine = 1;
            this.startColumn = 0;
            this.tokens = [];
            this.tokenizer = new EventedTokenizer(this, entityParser);
        }
        Tokenizer.prototype.tokenize = function (input) {
            this.tokens = [];
            this.tokenizer.tokenize(input);
            return this.tokens;
        };
        Tokenizer.prototype.tokenizePart = function (input) {
            this.tokens = [];
            this.tokenizer.tokenizePart(input);
            return this.tokens;
        };
        Tokenizer.prototype.tokenizeEOF = function () {
            this.tokens = [];
            this.tokenizer.tokenizeEOF();
            return this.tokens[0];
        };
        Tokenizer.prototype.reset = function () {
            this.token = null;
            this.startLine = 1;
            this.startColumn = 0;
        };
        Tokenizer.prototype.current = function () {
            var token = this.token,
                i;
            if (token === null) {
                throw new Error('token was unexpectedly null');
            }
            if (arguments.length === 0) {
                return token;
            }
            for (i = 0; i < arguments.length; i++) {
                if (token.type === arguments[i]) {
                    return token;
                }
            }
            throw new Error("token type was unexpectedly " + token.type);
        };
        Tokenizer.prototype.push = function (token) {
            this.token = token;
            this.tokens.push(token);
        };
        Tokenizer.prototype.currentAttribute = function () {
            var attributes = this.current("StartTag" /* StartTag */).attributes;
            if (attributes.length === 0) {
                throw new Error('expected to have an attribute started');
            }
            return attributes[attributes.length - 1];
        };
        Tokenizer.prototype.pushAttribute = function (attribute) {
            this.current("StartTag" /* StartTag */).attributes.push(attribute);
        };
        Tokenizer.prototype.addLocInfo = function () {
            if (this.options.loc) {
                this.current().loc = {
                    start: {
                        line: this.startLine,
                        column: this.startColumn
                    },
                    end: {
                        line: this.tokenizer.line,
                        column: this.tokenizer.column
                    }
                };
            }
            this.startLine = this.tokenizer.line;
            this.startColumn = this.tokenizer.column;
        };
        // Data
        Tokenizer.prototype.beginData = function () {
            this.push({
                type: "Chars" /* Chars */
                , chars: ''
            });
        };
        Tokenizer.prototype.appendToData = function (char) {
            this.current("Chars" /* Chars */).chars += char;
        };
        Tokenizer.prototype.finishData = function () {
            this.addLocInfo();
        };
        // Comment
        Tokenizer.prototype.beginComment = function () {
            this.push({
                type: "Comment" /* Comment */
                , chars: ''
            });
        };
        Tokenizer.prototype.appendToCommentData = function (char) {
            this.current("Comment" /* Comment */).chars += char;
        };
        Tokenizer.prototype.finishComment = function () {
            this.addLocInfo();
        };
        // Tags - basic
        Tokenizer.prototype.tagOpen = function () {};
        Tokenizer.prototype.beginStartTag = function () {
            this.push({
                type: "StartTag" /* StartTag */
                , tagName: '',
                attributes: [],
                selfClosing: false
            });
        };
        Tokenizer.prototype.beginEndTag = function () {
            this.push({
                type: "EndTag" /* EndTag */
                , tagName: ''
            });
        };
        Tokenizer.prototype.finishTag = function () {
            this.addLocInfo();
        };
        Tokenizer.prototype.markTagAsSelfClosing = function () {
            this.current("StartTag" /* StartTag */).selfClosing = true;
        };
        // Tags - name
        Tokenizer.prototype.appendToTagName = function (char) {
            this.current("StartTag" /* StartTag */, "EndTag" /* EndTag */).tagName += char;
        };
        // Tags - attributes
        Tokenizer.prototype.beginAttribute = function () {
            this.pushAttribute(['', '', false]);
        };
        Tokenizer.prototype.appendToAttributeName = function (char) {
            this.currentAttribute()[0] += char;
        };
        Tokenizer.prototype.beginAttributeValue = function (isQuoted) {
            this.currentAttribute()[2] = isQuoted;
        };
        Tokenizer.prototype.appendToAttributeValue = function (char) {
            this.currentAttribute()[1] += char;
        };
        Tokenizer.prototype.finishAttributeValue = function () {};
        Tokenizer.prototype.reportSyntaxError = function (message) {
            this.current().syntaxError = message;
        };
        return Tokenizer;
    }();

    exports.HTML5NamedCharRefs = namedCharRefs;
    exports.EntityParser = EntityParser;
    exports.EventedTokenizer = EventedTokenizer;
    exports.Tokenizer = Tokenizer;
    exports.tokenize = function (input, options) {
        var tokenizer = new Tokenizer(new EntityParser(namedCharRefs), options);
        return tokenizer.tokenize(input);
    };
});
(function (m) { if (typeof module === "object" && module.exports) { module.exports = m } }(requireModule('ember-template-compiler')));


}());
//# sourceMappingURL=ember-template-compiler.map
