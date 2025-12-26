<template>
<div>
  <div class="file-upload">
    <el-upload
      class="upload-demo"
      action
      :http-request="UploadSelectFunction"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :before-remove="beforeRemove"
      multiple
      :limit="3"
      :on-exceed="handleExceed"
      :file-list="fileList">
      <el-button size="middle" type="primary">点击上传</el-button>
    </el-upload>
  </div>
  <!-- 输入函数名字以及对应的模板 -->
    <br><br>
    <div class="create_func">
      <el-form>
        <el-form-item label="Function name">
          <el-input v-model="functionName"
                    placeholder="Please enter the function name"
                    :style = "{width : '200px' }">
          </el-input>
        </el-form-item>
        <el-form-item label="Selecting a template">
          <el-select v-model="selectedTemplate">
            <el-option
              v-for="template in templates"
              :key="template.template_id"
              :value="template.template_name"
              :label="template.template_name">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="Selecting a code-file">
          <el-select v-model="selectedCodefile">
            <el-option
              v-for="code_file in code_data"
              :key="code_file.name"
              :value="code_file.name"
              :label="code_file.name">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="createFunction">创建</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="data-list">
      <el-input v-model="searchText"
                placeholder="输入关键字搜索"
                @input="search"
                :style = "{width : '500px' }">
      </el-input>
      <el-table :data="filteredData" style="width: 40%;">
        <el-table-column prop="name" label="代码文件（只显示最近的10条）" style="width: 40%;"></el-table-column>
        <!-- 添加其他表格列，根据实际数据字段来设置 -->
        <el-table-column label="操作" style="width: 20%;">
          <template slot-scope="scope">
            <!-- 删除按钮 -->
            <el-button type="text" style="color: red;" @click="handleDelete(scope.$index, scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>


<script>
import axios from 'axios'
import { updateFuncInfo } from '@/api/FuncSpy'
import { getTemplateInfo } from '@/api/FuncTemplates'
import { CreateFunction,getCodeFile ,deleteFUNCFile} from '@/api/DevelopCenter'
import { baseURL } from '@/api/axiosConfig.js'

  export default {
    data() {
      return {
        code_data : [],
        searchText: '',
        fileList: [],
        functionName: '',           // 存储函数名字
        selectedTemplate: null,     // 存储选择的模板ID
        templates: [],              // 存储模板数据
        selectedCodefile : ''       // 存储选择的代码文件
      };
    },
    created() {
      this.fetchTemplate() // 在组件创建时获取模板数据
      this.UpdateCodefiles()
    },
    computed: {
        filteredData() {
        if (this.searchText) {
          return this.code_data.filter(item => {
            return item.name.toLowerCase().indexOf(this.searchText.toLowerCase()) > -1;
          }).slice(0, 10); // Only show the first 10 filtered results
        }
        else {
          return this.code_data.slice(0, 10); // Show the first 10 items when no search text
        }
      },
    },
    methods: {
      search() {
        // Automatically filters data based on computed property
      },
      fetchTemplate() {
        getTemplateInfo()
          .then(res => {
            console.log(res)
            this.templates= res.result
          })
          .catch(err => {
            console.log(err)
          })
      },
      handleRemove(file, fileList) {
        console.log(file, fileList);
      },
      handlePreview(file) {
        console.log(file);
      },
      handleExceed(files, fileList) {
        this.$message.warning(`当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`);
      },
      beforeRemove(file, fileList) {
        return this.$confirm(`确定移除 ${ file.name }?`);
      },
      UploadSelectFunction(myfile) {
        let fileObj = myfile.file
        let formData = new FormData()
        formData.append('fileToUpload', fileObj)    //加入文件对象
        console.log(formData)
        console.log(formData.get('fileToUpload'))
        let UploadFunction_url = baseURL + '/UploadFunction'
        axios.post(UploadFunction_url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then(res => {
          console.log("结果：", res);
          this.$message({
            message: '上传成功',
            type: 'success'
          })

        }).catch(error => {
          console.log("错误：", error);
          this.$message({
            message: '上传失败',
            type: 'error'
          })
        })
      },
      createFunction() {
        let data = {
          functionName: this.functionName,
          templateName: this.selectedTemplate,
          code_fileName: this.selectedCodefile
        }
        console.log(data)
        CreateFunction(data)
          .then(res => {
            console.log(res)
            this.$message({
              message: '创建成功',
              type: 'success'
            })
            updateFuncInfo()
          })
          .catch(err => {
            console.log(err)
            this.$message({
              message: '创建失败',
              type: 'error'
            })
          })
      },
      UpdateCodefiles() {
        // 更新代码文件列表
        getCodeFile()
          .then(res => {
            console.log(res)
            this.code_data = res.result
          })
          .catch(err => {
            console.log(err)
          })
      },
      handleDelete(index, row) {
        // 显示确认对话框
        this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
            }).then(() => {
              // 发送删除请求
              deleteFUNCFile(row)
                .then(response => {
                  if (response.status === 200) {
                    // 从数据中删除该行
                    this.filteredData.splice(index, 1);
                    this.$message({
                      type: 'success',
                      message: '删除成功!'
                    });
                  } else {
                    this.$message({
                      type: 'error',
                      message: response.data.message
                    });
                  }
                })
                .catch(error => {
                  this.$message({
                    type: 'error',
                    message: '删除失败: ' + error.message
                  });
                });
            }).catch(() => {
              this.$message({
                type: 'info',
                message: '已取消删除'
              });
            });
      }
    }
  }

</script>

<style>
/* 在此添加样式代码 */
.file-upload {
  margin-top: 20px;
}

/* 可自定义上传弹窗样式 */
.upload-demo {
  display: flex;
  align-items: left;
  justify-content: left;
  margin-top: 20px;
  margin-left: 20px;
}
.create_func{
  display: flex;
  align-items: left;
  justify-content: left;
  margin-top: 20px;
  margin-left: 20px;
}
.data-list{
  display: auto;
  align-items: left;
  justify-content: left;
  margin-top: 20px;
  margin-left: 20px;
}
</style>
