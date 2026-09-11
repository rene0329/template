<template>
  <div class="external-api-page">
    <header class="hero-card">
      <div>
        <p class="eyebrow">HELP CENTER · API REFERENCE</p>
        <h1>外部调度接口</h1>
        <p class="hero-copy">面向外部调度系统的数据集发现与调度方案提交协议。</p>
      </div>
      <div class="version-card">
        <span>接口版本</span>
        <strong>v1</strong>
        <small>共 2 个开放接口</small>
      </div>
    </header>

    <div class="document-layout">
      <aside class="api-nav" aria-label="接口目录">
        <div class="nav-title">接口目录</div>
        <button class="nav-link" type="button" @click="scrollTo('overview')">
          <span class="nav-index">00</span><span>接入说明</span>
        </button>
        <button
          v-for="api in apis"
          :key="api.id"
          class="nav-link"
          type="button"
          @click="scrollTo(api.anchor)"
        >
          <span class="method-mini" :class="api.method.toLowerCase()">{{ api.method }}</span>
          <span>{{ api.shortTitle }}</span>
        </button>
      </aside>

      <main class="document-content">
        <section id="overview" class="doc-section overview-section">
          <div class="section-heading">
            <span class="section-number">00</span>
            <div><h2>接入说明</h2><p>所有接口均由 practice-server 提供。</p></div>
          </div>
          <div class="info-grid">
            <div class="info-item"><span>基础地址</span><code>http://&#123;practice-server-host&#125;:&#123;port&#125;</code></div>
            <div class="info-item"><span>内容类型</span><code>application/json</code></div>
            <div class="info-item"><span>成功业务码</span><code>code = 0</code></div>
            <div class="info-item"><span>时间格式</span><code>RFC 3339 UTC</code></div>
          </div>
          <div class="flow" aria-label="接口调用流程">
            <div><b>01</b><span>查询数据集与副本</span></div><i class="el-icon-right" />
            <div><b>02</b><span>外部系统执行调度算法</span></div><i class="el-icon-right" />
            <div><b>03</b><span>提交调度方案</span></div>
          </div>
          <h3>统一响应结构</h3>
          <code-block :code="envelopeExample" label="JSON" @copy="copyCode" />
          <p class="unit-note">文件大小与读取量使用字节；CPU 使用核数；内存使用 GiB。</p>
        </section>

        <section v-for="(api, index) in apis" :id="api.anchor" :key="api.id" class="doc-section api-section">
          <div class="section-heading api-heading">
            <span class="section-number">0{{ index + 1 }}</span>
            <div>
              <div class="method-line"><span class="method-badge" :class="api.method.toLowerCase()">{{ api.method }}</span><code>{{ api.path }}</code></div>
              <h2>{{ api.title }}</h2>
              <p>{{ api.description }}</p>
            </div>
            <span class="status-badge">已实现</span>
          </div>

          <h3>{{ api.parameterTitle }}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr></thead>
              <tbody>
                <tr v-for="field in api.fields" :key="field.name">
                  <td><code>{{ field.name }}</code></td><td>{{ field.type }}</td>
                  <td><span :class="['required-mark', { required: field.required }]">{{ field.required ? '是' : '否' }}</span></td>
                  <td>{{ field.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="api.assignmentFields">
            <h3>assignments 数组项</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr></thead>
                <tbody>
                  <tr v-for="field in api.assignmentFields" :key="field.name">
                    <td><code>{{ field.name }}</code></td><td>{{ field.type }}</td><td><span class="required-mark required">是</span></td><td>{{ field.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <div class="examples-grid">
            <div><h3>{{ api.requestLabel }}</h3><code-block :code="api.requestExample" :label="api.requestLanguage" @copy="copyCode" /></div>
            <div><h3>成功响应 · HTTP {{ api.successStatus }}</h3><code-block :code="api.responseExample" label="JSON" @copy="copyCode" /></div>
          </div>
          <div class="error-row"><strong>主要错误</strong><span v-for="error in api.errors" :key="error.code"><code>{{ error.code }}</code> {{ error.text }}</span></div>
        </section>
      </main>
    </div>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </div>
</template>

<script>
const CodeBlock = {
  name: 'CodeBlock',
  props: { code: { type: String, required: true }, label: { type: String, default: 'JSON' }},
  template: `<div class="code-block"><div class="code-toolbar"><span>{{ label }}</span><button type="button" @click="$emit('copy', code)"><i class="el-icon-document-copy" /> 复制</button></div><pre><code>{{ code }}</code></pre></div>`
}

const json = value => JSON.stringify(value, null, 2)

export default {
  name: 'ExternalApi',
  components: { CodeBlock },
  data() {
    return {
      envelopeExample: json({ code: 0, msg: 'success', errorCode: null, data: {}, traceId: '7b013ecf7a9f4a16', timestamp: 1788251400000 }),
      apis: [
        {
          id: 'INT-DATASET-01', anchor: 'datasets-api', method: 'GET', path: '/api/v1/scheduling/datasets', shortTitle: '查询可调度数据集',
          title: '查询可调度数据集及副本', description: '返回当前处于 ACTIVE 状态且至少具有一个可用副本的数据集，供外部系统计算调度方案。',
          parameterTitle: '查询参数', requestLabel: '请求示例', requestLanguage: 'HTTP', successStatus: '200',
          fields: [
            { name: 'datasetIds', type: 'string', required: false, description: '逗号分隔的数据集 ID' },
            { name: 'category', type: 'string', required: false, description: '数据类别，例如 IMAGE、TABULAR' },
            { name: 'format', type: 'string', required: false, description: '数据格式，例如 NPZ' },
            { name: 'nodeId', type: 'integer', required: false, description: '按副本所在节点筛选' },
            { name: 'label', type: 'string', required: false, description: '按 key:value 格式筛选标签' },
            { name: 'page', type: 'integer', required: false, description: '页码，最小值 1，默认 1' },
            { name: 'pageSize', type: 'integer', required: false, description: '每页数量，1–100，默认 20' }
          ],
          requestExample: 'GET /api/v1/scheduling/datasets?category=IMAGE&format=NPZ&page=1&pageSize=20',
          responseExample: json({ code: 0, msg: 'success', errorCode: null, data: { list: [{ datasetId: 101, datasetCode: 'mnist', name: 'MNIST', version: '1.0', category: 'IMAGE', format: 'NPZ', sizeBytes: 188743680, sampleCount: 70000, schemaSummary: { type: 'TENSOR' }, schedulingHints: { preferredExecutionMode: 'DATA_LOCAL' }, replicas: [{ replicaId: 301, nodeId: 6, nodeName: 'storage-beijing', filePath: 'mnist/mnist-1.0.npz', sizeBytes: 188743680, availability: 'AVAILABLE' }] }], total: 1, page: 1, pageSize: 20 }, traceId: '7b013ecf7a9f4a16', timestamp: 1788251400000 }),
          errors: [{ code: 'default', text: '返回统一错误响应' }]
        },
        {
          id: 'INT-PLAN-01', anchor: 'plans-api', method: 'POST', path: '/api/v1/scheduling/plans', shortTitle: '提交调度方案',
          title: '提交并异步执行外部调度方案', description: '保存外部系统生成的方案并进入异步执行。HTTP 202 只表示方案已接受，不表示执行完成。',
          parameterTitle: '请求体字段', requestLabel: '请求体示例', requestLanguage: 'JSON', successStatus: '202',
          fields: [
            { name: 'externalPlanId', type: 'string', required: true, description: '外部系统的方案标识' },
            { name: 'taskId', type: 'string', required: true, description: '外部业务任务标识' },
            { name: 'runtimeImageId', type: 'integer(int64)', required: false, description: '可选的已验证、已启用运行镜像 ID' },
            { name: 'algorithm', type: 'object', required: false, description: '算法信息，可包含 name 和 version' },
            { name: 'assignments', type: 'array', required: true, description: '数据分配项，至少包含 1 项' }
          ],
          assignmentFields: [
            { name: 'datasetId', type: 'integer(int64)', description: '数据集 ID' },
            { name: 'replicaId', type: 'integer(int64)', description: '源数据副本 ID' },
            { name: 'sourceNodeId', type: 'integer(int32)', description: '源节点 ID' },
            { name: 'targetNodeId', type: 'integer(int32)', description: '目标节点 ID' },
            { name: 'action', type: 'string', description: 'USE_IN_PLACE、COPY_AND_USE、MOVE_AND_USE 或 REMOTE_READ' }
          ],
          requestExample: json({ externalPlanId: 'scheduler-plan-20260911-001', taskId: 'external-task-1001', runtimeImageId: 12, algorithm: { name: 'data-locality-first', version: '1.0' }, assignments: [{ datasetId: 101, replicaId: 301, sourceNodeId: 6, targetNodeId: 6, action: 'USE_IN_PLACE' }] }),
          responseExample: json({ code: 0, msg: 'success', errorCode: null, data: { planId: 501, externalPlanId: 'scheduler-plan-20260911-001', taskId: 'external-task-1001', status: 'ACCEPTED' }, traceId: '9c8d04bcaa1e47f2', timestamp: 1789113600000 }),
          errors: [{ code: '409', text: '资源状态冲突或方案标识冲突' }, { code: '422', text: '请求字段或业务规则校验失败' }]
        }
      ]
    }
  },
  methods: {
    scrollTo(id) {
      const target = document.getElementById(id)
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    async copyCode(code) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(code)
        else {
          const textarea = document.createElement('textarea')
          textarea.value = code
          textarea.setAttribute('readonly', '')
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        this.$message.success('代码已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动选择代码')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.external-api-page { min-height: calc(100vh - 50px); padding: 24px 28px 0; color: #263247; background: #f3f6fa; }
.hero-card { display: flex; justify-content: space-between; align-items: center; padding: 32px 38px; color: #fff; border-radius: 12px; background: linear-gradient(125deg, #102a43 0%, #174f73 58%, #167d8d 100%); box-shadow: 0 10px 28px rgba(16, 42, 67, .18); }
.eyebrow { margin: 0 0 8px; color: #81d8df; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; }
.hero-card h1 { margin: 0; font-size: 30px; font-weight: 600; }
.hero-copy { margin: 12px 0 0; color: #d6e8f2; font-size: 15px; }
.version-card { min-width: 150px; padding: 16px 20px; border: 1px solid rgba(255,255,255,.22); border-radius: 9px; background: rgba(255,255,255,.08); }
.version-card span, .version-card small { display: block; color: #c7dce7; }.version-card strong { display: block; margin: 4px 0; font-size: 25px; }
.document-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 22px; margin-top: 22px; align-items: start; }
.api-nav { position: sticky; top: 16px; padding: 14px 0; background: #fff; border: 1px solid #e3e9ef; border-radius: 9px; box-shadow: 0 3px 12px rgba(31, 52, 73, .05); }
.nav-title { padding: 7px 18px 13px; color: #8995a5; font-size: 12px; font-weight: 700; letter-spacing: .8px; }
.nav-link { display: flex; width: 100%; align-items: center; gap: 10px; padding: 12px 18px; color: #42526a; text-align: left; border: 0; border-left: 3px solid transparent; background: none; cursor: pointer; }
.nav-link:hover { color: #147d8d; border-left-color: #18a1b1; background: #f0fafb; }.nav-index { width: 34px; color: #95a2b2; font: 700 11px monospace; }
.method-mini, .method-badge { display: inline-block; color: #fff; border-radius: 4px; font-weight: 700; text-align: center; }.method-mini { width: 38px; padding: 3px 0; font-size: 10px; }.method-badge { min-width: 55px; padding: 5px 9px; font-size: 12px; }
.get { background: #178f73; }.post { background: #376bd6; }
.doc-section { scroll-margin-top: 16px; margin-bottom: 22px; padding: 30px 34px; background: #fff; border: 1px solid #e3e9ef; border-radius: 9px; box-shadow: 0 3px 12px rgba(31, 52, 73, .04); }
.section-heading { display: flex; gap: 17px; align-items: flex-start; padding-bottom: 20px; border-bottom: 1px solid #e9edf2; }.section-heading h2 { margin: 0 0 7px; font-size: 22px; }.section-heading p { margin: 0; color: #718096; line-height: 1.6; }
.section-number { flex: 0 0 auto; color: #1a98a8; font: 700 13px monospace; }.api-heading > div { flex: 1; }.status-badge { color: #16836b; padding: 5px 9px; border-radius: 12px; background: #e8f7f2; font-size: 12px; }
.method-line { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; }.method-line code { color: #334155; font-size: 15px; font-weight: 600; }
h3 { margin: 24px 0 12px; color: #344258; font-size: 15px; }
.info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }.info-item { padding: 15px; border-radius: 6px; background: #f6f8fb; }.info-item span { display: block; margin-bottom: 7px; color: #8491a3; font-size: 12px; }.info-item code { color: #194d66; }
.flow { display: flex; align-items: center; justify-content: center; gap: 17px; margin: 22px 0; padding: 17px; border: 1px dashed #cbd8e4; border-radius: 7px; }.flow div { display: flex; align-items: center; gap: 8px; }.flow b { color: #1591a1; font: 700 12px monospace; }.flow i { color: #9aabba; }.unit-note { margin: 13px 0 0; color: #718096; font-size: 13px; }
.table-wrap { overflow-x: auto; border: 1px solid #e2e8ef; border-radius: 6px; }table { width: 100%; border-collapse: collapse; font-size: 13px; }th { color: #64748b; font-weight: 600; background: #f6f8fa; }th, td { padding: 11px 13px; text-align: left; border-bottom: 1px solid #e8edf2; }tbody tr:last-child td { border-bottom: 0; }td code { color: #146f80; font-weight: 600; }.required-mark { color: #8290a3; }.required-mark.required { color: #c44949; }
.examples-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }.error-row { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; margin-top: 18px; padding: 13px 15px; color: #66758a; border-left: 3px solid #d79b3b; background: #fff9ed; font-size: 13px; }.error-row strong { color: #8c5d16; }.error-row code { margin-right: 4px; color: #b66028; }
.copyright-bar { padding: 18px 0; color: #9ba6b4; text-align: center; font-size: 12px; }
::v-deep .code-block { overflow: hidden; border-radius: 6px; background: #162337; }.code-toolbar { display: flex; justify-content: space-between; padding: 9px 13px; color: #8ea2b9; background: #1e2e44; font: 11px monospace; }.code-toolbar button { color: #c3d2e1; border: 0; background: none; cursor: pointer; }.code-toolbar button:hover { color: #61d2dc; }pre { overflow: auto; max-height: 390px; margin: 0; padding: 17px; color: #d8e4ef; font: 12px/1.65 Consolas, Monaco, monospace; white-space: pre; }
@media (max-width: 1050px) { .examples-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .external-api-page { padding: 14px 14px 0; }.hero-card { padding: 24px; }.version-card { display: none; }.document-layout { grid-template-columns: 1fr; }.api-nav { position: static; }.doc-section { padding: 23px 18px; }.info-grid { grid-template-columns: 1fr; }.flow { align-items: flex-start; flex-direction: column; }.flow i { transform: rotate(90deg); }.api-heading { flex-wrap: wrap; }.status-badge { margin-left: 30px; } }
</style>
