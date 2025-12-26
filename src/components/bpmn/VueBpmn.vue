<template>
  <div class="container">
    <div class="bpmn-viewer">
      <vue-header class="bpmn-viewer-header" :processData="initData" :modeler="bpmnModeler" @restart="restart"
                  @handleExportSvg="handleExportSvg" @handleExportBpmn="handleExportBpmn" @uploadBpmn="BpmnFileNameVisible=true"
                  @processSave="processSave"></vue-header>
      <div class="bpmn-viewer-container">
        <div class="bpmn-viewer-content" ref="bpmnViewer"></div>
      </div>
    </div>
    <bpmn-panel v-if="bpmnModeler" :modeler="bpmnModeler" :process="initData"></bpmn-panel>
    <!--对话框部分(修改流程图名字)-->
    <el-dialog title="流程图命名" :visible.sync="BpmnFileNameVisible">
      <el-input v-model="BpmnFileName" placeholder="请输入文件名">
        <template slot="append">.bpmn</template>
      </el-input>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="setDefaultFileName">默认</el-button>
        <el-button type="primary" @click="changeBpmnFileName">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
  import axios from 'axios'
  import { Message } from 'element-ui';
  import templateXml from "./data/template";
  import BpmnModeler from 'jeeplus-bpmn/lib/Modeler'
  import customTranslate from "./data/translate/customTranslate";
  import VueHeader from "./Header";
  import BpmnPanel from "./panel/index";
  import activitiModele from './data/activiti.json'
  import flowableModdle from './data/flowable.json'
  import './assets/css/vue-bmpn.css'
  import './assets/css/font-awesome.min.css'
  import { baseURL } from '@/api/axiosConfig.js'

  export default {
    name: "VueBpmn",
    data() {
      return {
        BpmnFileNameVisible : false,
        BpmnFileName: "",
        BpmnFileNameToUpload: "",
        bpmnModeler: null,
        initTemplate: '',
        initData: {}
      }
    },
    props: {
      product: String
    },
    components: {
      VueHeader, BpmnPanel
    },
    mounted() {
      let processId = new Date().getTime();
      this.initTemplate = templateXml.initTemplate(processId)
      this.initData = {key: "process" + processId, name: "流程" + processId, xml: this.initTemplate}
      this.init();
    },
    methods: {
      init() {
        // 支持activiti和flowable
        let _moddleExtensions = this.getModdleExtensions();
        // 获取画布 element
        this.canvas = this.$refs.bpmnViewer;
        // 创建Bpmn对象
        this.bpmnModeler = new BpmnModeler({
          container: this.canvas,
          additionalModules: [
            {
              translate: ['value', customTranslate]
            }
          ],
          moddleExtensions: _moddleExtensions
        });

        /*let _tag = document.getElementsByClassName("djs-overlay-container")[0];
        if (_tag) {
          _tag.style.width = "100%";
          _tag.style.height = "100%";
        }*/

        // 初始化建模器内容
        this.initDiagram(this.initTemplate);
      },
      initDiagram(xml) {
        this.bpmnModeler.importXML(xml, err => {
          if (err) {
            this.$modal.msgError('打开模型出错, 请确认该模型符合 Bpmn2.0 规范')
            return
          }
          let _tag = document.getElementsByTagName("svg")[0];
          if (_tag) {
            _tag.style.width = "100%";
            _tag.style.height = "700px";
          }
        });
      },
      handleExportBpmn() {
        const _this = this;
        this.bpmnModeler.saveXML(function (err, xml) {
          if (err) {
            console.error(err)
          }
          let {filename, href} = _this.setEncoded('BPMN', xml);
          if (href && filename) {
            let a = document.createElement('a');
            a.download = filename; //指定下载的文件名
            a.href = href; //  URL对象
            a.click(); // 模拟点击
            URL.revokeObjectURL(a.href); // 释放URL 对象
          }
        });
      },
      uploadBpmn() {
        const _this = this;
        this.$message.info('流程图正在上传');
        this.bpmnModeler.saveXML(function (err, xml) {
          if (err) {
            console.error(err)
          }
          const bpmnToUpload = xml;
          let CodeFunction_url = baseURL + '/bpmnUpload';
          axios.post(CodeFunction_url, { code: bpmnToUpload , filename:_this.BpmnFileNameToUpload })
            .then(response => {
              console.log('文件上传成功', response.data);
              Message.success('文件上传成功');
            })
            .catch(error => {
              console.error('文件上传失败', error);
              Message.error('文件上传失败');
            });
        });
      },
      handleExportSvg() {
        const _this = this;
        this.bpmnModeler.saveSVG(function (err, svg) {
          if (err) {
            console.error(err)
          }
          let {filename, href} = _this.setEncoded('SVG', svg);
          if (href && filename) {
            let a = document.createElement('a');
            a.download = filename;
            a.href = href;
            a.click();
            URL.revokeObjectURL(a.href);
          }
        });
      },
      setEncoded(type, data) {
        const encodedData = encodeURIComponent(data);
        if (data) {
          if (type === 'XML') {
            return {
              filename: `${this.initData.key}.bpmn20.xml`,
              href: "data:application/bpmn20-xml;charset=UTF-8," + encodedData,
              data: data
            }
          }
          if (type === 'BPMN') {
            return {
              filename: `${this.initData.key}.bpmn`,
              href: "data:application/bpmn20-xml;charset=UTF-8," + encodedData,
              data: data
            }
          }
          if (type === 'SVG') {
            this.initData.svg = data;
            return {
              filename: `${this.initData.key}.svg`,
              href: "data:application/text/xml;charset=UTF-8," + encodedData,
              data: data
            }
          }
        }
      },
      processSave(data) {
        let initData = this.initData;
        data.procId = initData.key;
        data.name = initData.name;
        this.$emit("processSave", data);
      },
      restart() {
        let processId = new Date().getTime();
        this.initTemplate = templateXml.initTemplate(processId)
        this.initData = {key: "process" + processId, name: "流程" + processId, xml: this.initTemplate}
        this.initDiagram(this.initTemplate)
      },
      getModdleExtensions() {
        let moddleExtensions = {};
        if (this.product === 'flowable') {
          moddleExtensions = {
            flowable: flowableModdle
          }
        }
        if (this.product === 'activiti') {
          moddleExtensions = {
            activiti: activitiModele
          }
        }
        return moddleExtensions;
      },
      changeBpmnFileName() {
        if (this.BpmnFileName.trim() === '') {
          this.$message.error('文件名不能为空');
        } else {
          this.BpmnFileNameToUpload=this.BpmnFileName;
          this.BpmnFileName='';
          this.BpmnFileNameVisible = false;
          this.uploadBpmn();
        }
      },
      setDefaultFileName() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString().replace(/\//g, '_') +
                              '_' +
                              now.toLocaleTimeString().replace(/:/g, '_');
        this.BpmnFileName = formattedDate;
      }
    }
  }
</script>

<style scoped>

</style>
