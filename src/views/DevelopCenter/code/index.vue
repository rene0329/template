<template>
  <div>
    <div id="app">
      <h1 style="text-align: center;">Easy-CodeEditor</h1>
      <div style="text-align: center;">
        语言：
        <el-select
          v-model="opts.language"
          clearable
          placeholder="请选择"
          size="mini"
          @change="changeLanguage"
        >
          <el-option
            v-for="item in sets.language"
            :key="item"
            :label="item"
            :value="item"
          >
          </el-option>
        </el-select>
        样式风格：
        <el-select
          v-model="opts.theme"
          clearable
          placeholder="请选择"
          size="mini"
          @change="changeTheme"
        >
          <el-option
            v-for="item in sets.theme"
            :key="item"
            :label="item"
            :value="item"
          >
          </el-option>
        </el-select>
        <el-button type="primary" size="mini" @click="compile"
          >编译</el-button
        >
        <el-button type="primary" size="mini" @click="upload"
          >上传</el-button
        >
      </div>
    </div>
    <div>
    <br>
      <!--调用子组件-->
      <monaco
        ref="monaco"
        :opts="opts"
        @change="changeValue"
        :height="600"
      ></monaco>
    </div>
  </div>
</template>
<script>
import axios from 'axios'
import { MessageBox } from 'element-ui';
import monaco from '@/components/monacoeditor.vue'
import { baseURL } from '@/api/axiosConfig.js'
export default {
  components: { monaco },
  data () {
    return {
      sets: {
        language: {
          'apex': 'apex',
          'azcli': 'azcli',
          'bat': 'bat',
          'c': 'c',
          'clojure': 'clojure',
          'coffeescript': 'coffeescript',
          'cpp': 'cpp',
          'csharp': 'csharp',
          'csp': 'csp',
          'css': 'css',
          'dockerfile': 'dockerfile',
          'fsharp': 'fsharp',
          'go': 'go',
          'graphql': 'graphql',
          'handlebars': 'handlebars',
          'html': 'html',
          'ini': 'ini',
          'java': 'java',
          'javascript': 'javascript',
          'json': 'json',
          'kotlin': 'kotlin',
          'less': 'less',
          'lua': 'lua',
          'markdown': 'markdown',
          'msdax': 'msdax',
          'mysql': 'mysql',
          'objective-c': 'objective-c',
          'pascal': 'pascal',
          'perl': 'perl',
          'pgsql': 'pgsql',
          'php': 'php',
          'plaintext': 'plaintext',
          'postiats': 'postiats',
          'powerquery': 'powerquery',
          'powershell': 'powershell',
          'pug': 'pug',
          'python': 'python',
          'r': 'r',
          'razor': 'razor',
          'redis': 'redis',
          'redshift': 'redshift',
          'ruby': 'ruby',
          'rust': 'rust',
          'sb': 'sb',
          'scheme': 'scheme',
          'scss': 'scss',
          'shell': 'shell',
          'sol': 'sol',
          'sql': 'sql',
          'st': 'st',
          'swift': 'swift',
          'tcl': 'tcl',
          'typescript': 'typescript',
          'vb': 'vb',
          'xml': 'xml',
          'yaml': 'yaml'
        },
        theme: {
          'vs': 'vs',
          'vs-dark': 'vs-dark',
          'hc-black': 'hc-black'
        }
      },
      opts: {
        value: '',
        readOnly: false, // 是否可编辑
        language: 'python', // 语言类型
        theme: 'vs' // 编辑器主题
      }
    }
  },
  methods: {
    changeLanguage (val) {
      this.opts.language = val
    },
    changeTheme (val) {
      this.opts.theme = val
    },
    //编译代码
    compile() {
      this.$message.info('代码正在编译');
      const codeToCompile = this.$refs.monaco.getVal(); // 从 Monaco Editor获取代码
      let CodeFunction_url = baseURL + '/CodeFunction'
      axios.post(CodeFunction_url, { code: codeToCompile })
        .then(response => {
          console.log('编译结果:', response.data); // 打印结果
            MessageBox.alert(response.data, '编译结果', {
              dangerouslyUseHTMLString: true,
              confirmButtonText: '确定',
              customClass: 'my-message-box'
            });
        })
        .catch(error => {
          console.error('编译错误:', error);
            //this.$message.error('编译错误: ' + error.message);
            // Handle the error
        });
    },
    // 上传文件
    upload () {
      this.$message.info('代码正在上传');
      const codeToUpload = this.$refs.monaco.getVal();
      let CodeFunctionUpload_url = baseURL + '/CodeFunctionUpload'
      axios.post(CodeFunctionUpload_url, { code: codeToUpload })
        .then(response => {
          console.log('文件上传成功', response.data);
          this.$message.success('文件上传成功');
        })
        .catch(error => {
          console.error('文件上传失败', error);
          this.$message.error('文件上传失败: ' + error.message);
        });
    },
    // 内容改变自动获取值
    changeValue (val) {
      console.log(val)
    }
  }
}
</script>
<style>
.my-message-box {
  max-width: 1000px;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: #2c3e50;
  margin-top: 0px;
}
</style>






