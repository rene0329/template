<template>
  <div class="json-editor">
    <el-row style="height: 100%;overflow-y: auto;">
      <textarea ref="codemirror"/>
    </el-row>
    <slot></slot>
  </div>
</template>

<script>
// 引入CodeMirror和基础样式
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
// JSON代码高亮需要由JavaScript插件支持
import "codemirror/mode/javascript/javascript.js";
// 选择IDEA主题样式，还有其他很多主题可选
import "codemirror/theme/idea.css";
// 支持使用Sublime快捷键
import "codemirror/keymap/sublime.js";
// 搜索功能的依赖
import "codemirror/addon/dialog/dialog.js";
import "codemirror/addon/dialog/dialog.css";
// 支持搜索功能
import "codemirror/addon/search/search";
import "codemirror/addon/search/searchcursor.js";
// 支持各种代码折叠
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/fold/comment-fold.js";
// 支持代码区域全屏功能
import "codemirror/addon/display/fullscreen.css";
import "codemirror/addon/display/fullscreen.js";
// 支持括号自动匹配
import "codemirror/addon/edit/matchbrackets.js";
import "codemirror/addon/edit/closebrackets.js";
// 支持代码自动补全
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/show-hint.js";
import "codemirror/addon/hint/anyword-hint.js";
// 行注释
import "codemirror/addon/comment/comment.js";
// JSON错误检查
import "codemirror/addon/lint/lint.css";
import "codemirror/addon/lint/lint.js";
// 需要依赖全局的jsonlint，不是很优雅
import "codemirror/addon/lint/json-lint.js";
//及时自动更新，配置里面也需要设置autoRefresh为true
import 'codemirror/addon/display/autorefresh';
// 引入jsonlint
import jsonlint from "jsonlint-mod";
window.jsonlint = jsonlint;

export default {
  name: "JsonEditor",
  /* eslint-disable vue/require-prop-types */
  props: {
    value: [String, Number, Object, Array],
    readOnly: [Boolean],
  },
  data() {
    return {
      jsonEditor: false
    };
  },
  // 监听是否数据改变，随时更新json数据
  watch: {
    value(value) {
      // console.log(value);
      const editorValue = this.jsonEditor.getValue();
      if (value !== editorValue) {
        this.jsonEditor.setValue(JSON.stringify(this.value, null, 2));
      }
      this.jsonEditor.refresh()
    },
  },
  mounted() {
    // CodeMirror的配置项，搜官网看这里的配置项配置
    this.jsonEditor = CodeMirror.fromTextArea(this.$refs.codemirror, {
      mode: "application/json",  // 接受的类型，json xml....
      smartIndent: true, // 是否智能缩进
      styleActiveLine: true, // 当前行高亮
      lineNumbers: true, // 是否显示行数
      indentUnit: 2, // 缩进单位，默认2
      gutters: [
        "CodeMirror-linenumbers",
        "CodeMirror-foldgutter",
        "CodeMirror-lint-markers",      // CodeMirror-lint-markers是实现语法报错功能
      ],
      lint: true,
      //lineWrapping: true, // 自动换行
      matchBrackets: true, // 括号匹配显示
      autoCloseBrackets: true, // 输入和退格时成对
      readOnly: this.readonly, // 只读
      foldGutter: true,
      autoRefresh: true
    });

    this.jsonEditor.setValue(JSON.stringify(this.value, null, 2));
    this.jsonEditor.on("change", cm => {
      this.$emit("changed", cm.getValue());
      // this.$emit('input', cm.getValue())
      // 编辑json框里面的内容可以时刻监听到值，通过cm.getValue()获取到
    });
  },
  methods: {
    getValue() {
      return this.jsonEditor.getValue();
    },
  }
};
</script>

<style scoped>
.json-editor {
  height: 100%;
  position: relative;
}
.json-editor >>> .CodeMirror {
  height: auto;
  min-height: 300px;
}
.json-editor >>> .CodeMirror-scroll {
  min-height: 300px;
}
</style>
