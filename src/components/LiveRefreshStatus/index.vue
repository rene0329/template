<template>
  <span class="live-refresh-status" title="最近更新时间">
    <i class="el-icon-time" />
    <span class="live-refresh-status__time">{{ updatedAt || '--:--:--' }}</span>
  </span>
</template>

<script>
export default {
  name: 'LiveRefreshStatus',
  props: {
    updatedAt: {
      type: String,
      default: ''
    },
    interval: {
      type: Number,
      default: 1
    }
  }
}
</script>

<style scoped>
.live-refresh-status {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: #606266;
  font-size: 12px;
  white-space: nowrap;
}

.live-refresh-status__dot {
  width: 7px;
  height: 7px;
  margin-right: 7px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.14);
}

.live-refresh-status__time {
  margin-left: 4px;
  color: #909399;
  font-variant-numeric: tabular-nums;
}
</style>
