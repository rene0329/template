<template>
  <div class="model-form">
    <div class="center-content">
      <h1>欢迎使用我们的应用，创建自己的模型</h1>
      <br>
      <el-form ref="formData" :rules="rules" :model="formData" label-width="120px"  v-loading="loading">
        <el-form-item label="模型类型" prop="model_type">
          <el-select v-model="formData.model_type" placeholder="请选择">
            <el-option label="负载预测" value="负载预测" />
            <el-option label="实例伸缩" value="实例伸缩" />
            <el-option label="初始部署" value="初始部署" />
            <el-option label="动态迁移" value="动态迁移" />
            <el-option label="任务调度" value="任务调度" />
          </el-select>
        </el-form-item>

        <el-form-item label="模型名称" prop="model_name">
          <el-input v-model="formData.model_name" />
        </el-form-item>

        <el-form-item label="模型作者" prop="model_author">
          <el-input :value="formData.model_author" disabled />
        </el-form-item>

        <el-form-item label="模型描述" prop="model_desc">
          <el-input type="textarea" v-model="formData.model_desc" />
        </el-form-item>

        <el-form-item label="公开范围" prop="model_scope">
          <el-radio-group v-model="formData.model_scope">
            <el-radio label="私有">私有</el-radio>
            <el-radio label="公有">公有</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="模型镜像" prop="model_image">
          <el-input v-model="formData.model_image" />
        </el-form-item>

         <el-form-item label="配置参数" prop="configParm_fileList">
          <el-upload
            class="doc-upload"
            action="/upload"
            :auto-upload="false"
            :on-change="handleConfigParmChange"
            :on-remove="handleRemove"
            :before-remove="beforeRemove"
            :file-list="formData.configParm_fileList"
          >
            <el-button size="middle">选择文件</el-button>
          </el-upload>
        </el-form-item>


        <el-form-item>
          <el-button type="primary" @click="submitForm('formData')">创建模型</el-button>
          <el-button @click="resetForm('formData')">重置</el-button>
        </el-form-item>
      </el-form>

    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { submit_model } from '@/api/ModelManager'
import { baseURL } from '@/api/axiosConfig.js'

export default {
  data() {
    return {
      formData: {
        model_type: '',
        model_name: '',
        model_author: 'admin', // 你需要替换为实际的昵称
        model_desc: '',
        model_scope: '',
        model_image: '',
        configParm_fileList: [],
        configPng: '',
        configFile: '',
      },
      rules: {
        model_name: [
          { required: true, message: '请输入模型名字', trigger: 'change' }
        ],
        model_type: [
          { required: true, message: '请选择模型类型', trigger: 'change' }
        ],
        model_author: [
          { required: false }
        ],
        model_desc: [
          { required: false }
        ],
        model_scope: [
          { required: true, message: '请选择模型公开范围', trigger: 'change' }
        ],
        model_image: [
          { required: true, message: '请选择模型镜像', trigger: 'change' }
        ],
        configParm_fileList: [
          { required: true, message: '请选择模型配置文件', trigger: 'change' }
        ]
      },
      loading: false
    };
  },
  methods: {
    handleConfigParmChange(file, fileList) {
      this.formData.configParm_fileList = fileList; // 将选择的文件列表保存到 formData 中
    },
    handleDocFileChange(file, fileList) {
      this.formData.configFile = file.raw;
    },
    async submitForm(formName) {
    try {
        const valid = await this.$refs[formName].validate();

        if (valid) {

          this.loading = true;

          // 验证通过，发送 POST 请求到后端，上传数据到数据库
          let submit_model_url = baseURL + '/submit_model';
          const response = await axios.post(submit_model_url, this.formData);
          // 处理返回结果
          if (response.status === 200) {
            this.$message.success('提交成功');
          } else {
            this.$message.error('提交失败');
          }


          // 上传配置参数文件
          let fileObj = this.formData.configParm_fileList[0].raw;
          let formData = new FormData();
          formData.append('fileToUpload', fileObj); //加入文件对象
          console.log(fileObj);
          console.log(formData);
          console.log(formData.get('fileToUpload'));
          let uploadParmFile_url = baseURL + '/uploadParmFile'
          axios.post(uploadParmFile_url, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }).then(
            res => {
              console.log("结果：", res);
              this.$message({
                message: '上传成功',
                type: 'success'
              })
            },
          ).catch(error => {
            console.log("错误：", error);
            this.$message({
              message: '上传失败',
              type: 'error'
            })
          })
        } else {
          this.$message.error('表单验证失败，请检查输入');
        }
      } catch (error) {
        console.error('创建失败:', error);
        this.$message.error('创建失败: ' + error.message);
      }finally {
        this.loading = false; // 无论成功还是失败，都取消 loading
      }
    },
    handleRemove(file, fileList) {
      // 找到被移除文件在 configParm_fileList 中的索引
      const index = this.formData.configParm_fileList.indexOf(file);
      if (index !== -1) {
        // 从 configParm_fileList 数组中移除文件
        this.formData.configParm_fileList.splice(index, 1);
      }
    },
    handlePreview(file) {
      console.log(file);
    },
    handleExceed(files, fileList) {
      this.$message.warning(`当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`);
    },
    beforeRemove(file, fileList) {
      return this.$confirm(`确定移除 ${ file.name }？`);
    },
    resetForm(formName) {
      this.$refs[formName].resetFields();
    }
  },
};
</script>

<style scoped>
.model-form {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* 确保容器至少占满整个视口高度 */
}
.config-upload {
  display: inline-block;
}
.center-content {
  width: 70%; /* 调整表单宽度 */
  margin-right: 1%; /* 左侧偏移量 */
}
</style>
