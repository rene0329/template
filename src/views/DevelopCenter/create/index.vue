<template>

<el-form ref="form" :model="form" label-width="200px" style="margin-top: 40px; text-align: left;">
    <el-form-item label="应用名称">
      <el-input v-model="form.name" placeholder="给应用名称起个名字" style="width: 500px;"></el-input>
    </el-form-item>
    <el-form-item label="应用描述">
      <el-input type="textarea" :rows="4" 
                placeholder="请输入你的应用程序介绍" 
                v-model="form.description"
                style="width: 500px;">
      </el-input>
    </el-form-item>

    <el-form-item label="启动时间">
      <el-col :span="80">
        <el-date-picker type="date" placeholder="选择日期" v-model="form.date1" style="width: 100%;"></el-date-picker>
      </el-col>
      <el-col :span="80">
        <el-time-picker placeholder="选择时间" v-model="form.date21" style="width: 100%;"></el-time-picker>
      </el-col>
    </el-form-item>

    <el-form-item label="期望时间">
      <el-col :span="80">
        <el-time-picker placeholder="选择时间" v-model="form.date22" style="width: 100%;"></el-time-picker>
      </el-col>
    </el-form-item>

    <el-form-item label="截止时间">
      <el-col :span="80">
        <el-time-picker placeholder="选择时间" v-model="form.date23" style="width: 100%;"></el-time-picker>
      </el-col>
    </el-form-item>
    
    <el-form-item label="期望成本">
      <el-input v-model="form.expectcost" placeholder="预算的运行成本" style="width: 220px;">
        <template #append>元</template>
      </el-input>
    </el-form-item>

    <el-form-item label="最大成本">
      <el-input v-model="form.maxcost" placeholder="最大的运行成本" style="width: 220px;">
        <template #append>元</template>
      </el-input>
    </el-form-item>
    
    <el-form-item label="偏好权重">
      <el-input-number v-model="form.weight"
                    :min="0"
                    :max="100"
                    :step="1"
                    :controls="true"
                    :formatter="formatWeight"
                    :parser="parseWeight"
                    style="width: 180px;">
        <template #append>%</template>
      </el-input-number>
    </el-form-item>



    <el-form-item>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button>保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
    data() {
    return {
        form: {
        name: '',
        region: '',
        date1: '',
        date2: '',
        delivery: false,
        type: [],
        resource: '',
        desc: ''
        }
    }
    },
    methods: {
    onSubmit() {
        console.log('submit!');
    },
    formatWeight(value) {
        return value + '%';
    },
    parseWeight(value) {
        return parseFloat(value.replace('%', ''));
    }
    }
}
</script>