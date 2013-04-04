/**
 * @fileoverview AVL tree suitable for async tranversal and resume.
 *
 * Basically this is slight modification of @see goog.structs.AvlTree.
 * Unfortunately, the original class cannot be override since some functions
 * are not expose to superclass.
 *
 *  @suppress {accessControls}
 */


goog.provide('ydn.db.con.simple.AvlTree');
goog.require('goog.structs.AvlTree');


/**
 *
 * {Function=} opt_comparator Function used to order the tree's nodes.
 * @constructor
 * @extends {goog.structs.AvlTree}
 */
ydn.db.con.simple.AvlTree = function(opt_comparator) {
  goog.base(this, opt_comparator);
};
goog.inherits(ydn.db.con.simple.AvlTree, goog.structs.AvlTree);



/**
 * Performs an in-order traversal of the tree and calls {@code func} with each
 * traversed node, optionally starting from the smallest node with a value >= to
 * the specified start value. The traversal ends after traversing the tree's
 * maximum node or when {@code func} returns a value that evaluates to true.
 *
 * @param {function(goog.structs.AvlTree.Node)} func Function to call on each
 * traversed node.
 * @param {Object=} opt_startValue If
 * specified, traversal will begin on the node with the smallest
 * value >= opt_startValue. If AvlTree.Node, this will start immediately
 * from the node exclusive.
 */
ydn.db.con.simple.AvlTree.prototype.traverse =
    function(func, opt_startValue) {
      // If our tree is empty, return immediately
      if (!this.root_) {
        return;
      }

      // Depth traverse the tree to find node to begin in-order traversal from
      var startNode;
      if (opt_startValue instanceof goog.structs.AvlTree.Node) {
        startNode = opt_startValue;
      } else if (opt_startValue) {
        this.traverse_(function(node) {
          var retNode = null;
          if (this.comparator_(node.value, opt_startValue) > 0) {
            retNode = node.left;
            startNode = node;
          } else if (this.comparator_(node.value, opt_startValue) < 0) {
            retNode = node.right;
          } else {
            startNode = node;
          }
          return retNode; // If null, we'll stop traversing the tree
        });
        if (!startNode) {
          return;
        }
      } else {
        startNode = this.getMinNode_();
      }

      // Traverse the tree and call func on each traversed node's value
      var node = startNode, prev = startNode.left ? startNode.left : startNode;
      while (node != null) {
        if (node.left != null && node.left != prev && node.right != prev) {
          node = node.left;
        } else {
          if (node.right != prev) {
            if (func(node)) {
              return;
            }
          }
          var temp = node;
          node = node.right != null && node.right != prev ?
              node.right :
              node.parent;
          prev = temp;
        }
      }
    };


/**
 * Performs a reverse-order traversal of the tree and calls {@code func} with
 * each traversed node, optionally starting from the largest node with a value
 * <= to the specified start value. The traversal ends after traversing the
 * tree's minimum node or when func returns a value that evaluates to true.
 *
 * @param {function(goog.structs.AvlTree.Node)} func Function to call on each
 * traversed node.
 * @param {Object=} opt_startValue If
 * specified, traversal will begin on the node with the smallest
 * value >= opt_startValue. If AvlTree.Node, this will start immediately
 * from the node exclusive.
 */
ydn.db.con.simple.AvlTree.prototype.reverseTraverse =
    function(func, opt_startValue) {
      // If our tree is empty, return immediately
      if (!this.root_) {
        return;
      }

      // Depth traverse the tree to find node to begin reverse-order traversal from
      var startNode;
      if (opt_startValue instanceof goog.structs.AvlTree.Node) {
        startNode = opt_startValue;
      } else if (opt_startValue) {
        this.traverse_(goog.bind(function(node) {
          var retNode = null;
          if (this.comparator_(node.value, opt_startValue) > 0) {
            retNode = node.left;
          } else if (this.comparator_(node.value, opt_startValue) < 0) {
            retNode = node.right;
            startNode = node;
          } else {
            startNode = node;
          }
          return retNode; // If null, we'll stop traversing the tree
        }, this));
        if (!startNode) {
          return;
        }
      } else {
        startNode = this.getMaxNode_();
      }

      // Traverse the tree and call func on each traversed node's value
      var node = startNode, prev = startNode.right ? startNode.right : startNode;
      while (node != null) {
        if (node.right != null && node.right != prev && node.left != prev) {
          node = node.right;
        } else {
          if (node.left != prev) {
            if (func(node)) {
              return;
            }
          }
          var temp = node;
          node = node.left != null && node.left != prev ?
              node.left :
              node.parent;
          prev = temp;
        }
      }
    };

