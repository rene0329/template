import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

/* Layout */
import Layout from "@/layout";

/**
 * Note: sub-menu only appear when route children.length >= 1
 * Detail see: https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 *
 * hidden: true                   if set true, item will not show in the sidebar(default is false)
 * alwaysShow: true               if set true, will always show the root menu
 *                                if not set alwaysShow, when item has more than one children route,
 *                                it will becomes nested mode, otherwise not show the root menu
 * redirect: noRedirect           if set noRedirect will no redirect in the breadcrumb
 * name:'router-name'             the name is used by <keep-alive> (must set!!!)
 * meta : {
    roles: ['admin','editor']    control the page roles (you can set multiple roles)
    title: 'title'               the name show in sidebar and breadcrumb (recommend set)
    icon: 'svg-name'/'el-icon-x' the icon show in the sidebar
    breadcrumb: false            if set false, the item will hidden in breadcrumb(default is true)
    activeMenu: '/example/list'  if set path, the sidebar will highlight the path you set
  }
 */

/**
 * constantRoutes
 * a base page that does not have permission requirements
 * all roles can be accessed
 */
export const constantRoutes = [
  {
    path: "/login",
    component: () => import("@/views/login/index"),
    hidden: true,
  },

  {
    path: "/404",
    component: () => import("@/views/404"),
    hidden: true,
  },

  {
    path: "/",
    redirect: "/workspace",
    hidden: true,
  },
  // 开发中心模块
  {
    path: "/DevelopCenter",
    component: Layout,
    redirect: "/DevelopCenter/code",
    name: "DevelopCenter",
    hidden: true,
    alwaysShow: true,
    meta: {
      title: "开发中心",
      icon: "people",
      itemHeight: 48,
    },
    // 原版：分为创建应用，模板管理，开发平台三个子模块
    // 新版：
    children: [
      // {
      //   path: 'create',
      //   component: () => import('@/views/DevelopCenter/create/index'),
      //   name: 'Create',
      //   meta: { title: '创建应用', icon: 'form' }
      // },
      {
        path: "code",
        component: () => import("@/views/DevelopCenter/code/index"),
        name: "code",
        meta: { title: "编程平台", icon: "link", itemHeight: 40 },
      },
      {
        path: "upload",
        component: () => import("@/views/DevelopCenter/upload/index"),
        name: "upload",
        meta: { title: "函数创建", icon: "form", itemHeight: 40 },
      },
      {
        path: "design",
        component: () => import("@/views/DevelopCenter/design/index"),
        name: "design",
        meta: { title: "流程设计", icon: "nested", itemHeight: 40 },
      },
      {
        path: "generate",
        component: () => import("@/views/DevelopCenter/generate/index"),
        name: "generate",
        meta: { title: "一键生成", icon: "example", itemHeight: 40 },
      },
      // {
      //   path: 'create',
      //   component: () => import('@/views/DevelopCenter/create/index'),
      //   name: 'create',
      //   meta: { title: '应用创建', icon: 'form' }
      // },
    ],
  },
  // 监控中心模块
  {
    path: "/SpyCenter",
    component: Layout,
    redirect: "/SpyCenter/server_spy",
    name: "SpyCenter",
    hidden: true,
    alwaysShow: true,
    meta: {
      title: "监控中心",
      icon: "spy",
      itemHeight: 48,
    },
    children: [
      // 综合监控
      // {
      //   path: 'comprehensive_spy',
      //   component: () => import('@/views/SpyCenter/comprehensive_spy/index'),
      //   name: 'ComprehensiveSpy',
      //   meta: { title: '综合监控', icon: 'server' }
      // },
      {
        path: "cluster_spy",
        component: () => import("@/views/SpyCenter/cluster_spy/index"),
        name: "ClusterSpy",
        meta: { title: "集群监控", icon: "cluster", itemHeight: 40 },
      },
      {
        path: "server_spy",
        component: () => import("@/views/SpyCenter/server_spy/index"), // Parent router-view
        name: "ServerSpy",
        meta: { title: "服务器监控", icon: "server", itemHeight: 40 },
      },
      {
        path: "container_spy",
        component: () => import("@/views/SpyCenter/container_spy/index"),
        name: "container",
        meta: { title: "方舱容器监管", icon: "form", itemHeight: 40 },
      },
      {
        path: "workflow",
        component: () => import("@/views/SpyCenter/workflow/index"),
        name: "Workflow",
        meta: { title: "方舱工作流监管", icon: "workflow", itemHeight: 40 },
      },
      {
        path: "function_spy",
        component: () => import("@/views/SpyCenter/function_spy/index"),
        name: "function",
        meta: { title: "方舱函数监管", icon: "函数", itemHeight: 40 },
      },
      {
        path: "data_monitor",
        component: () => import("@/views/SpyCenter/data_monitor/index"),
        name: "data",
        meta: { title: "数据监管", icon: "函数", itemHeight: 40 },
      },

      // {
      //   path: 'workflow_spy',
      //   component: () => import('@/views/SpyCenter/workflow_spy/index'),
      //   name: 'WorkflowSpy',
      //   meta: { title: '工作流详情', icon: 'workflow' }
      // }
    ],
  },
  //模型中心
  {
    path: "/ModelTaskCenter",
    component: Layout,
    redirect: "/ModelTaskCenter/CreateModels",
    name: "ModelTaskCenter",
    hidden: true,
    alwaysShow: true,
    meta: {
      title: "模型中心",
      icon: "clipboard",
      itemHeight: 48,
    },
    children: [
      {
        path: "CreateModels",
        component: () => import("@/views/ModelTaskCenter/CreateModels/index"),
        name: "CreateModels",
        meta: { title: "创建模型", icon: "form", itemHeight: 40 },
      },
      {
        path: "ModelManager",
        component: () => import("@/views/ModelTaskCenter/ModelManager/index"),
        name: "ModelManager",
        meta: { title: "模型管理", icon: "form", itemHeight: 40 },
      },
    ],
  },
  {
    path: "/AnalyzeCenter",
    component: Layout,
    redirect: "/AnalyzeCenter/CreatePredictTask",
    name: "AnalyzeCenter",
    hidden: true,
    alwaysShow: true,
    meta: {
      title: "分析中心",
      icon: "分析",
      itemHeight: 48,
    },
    children: [
      {
        path: "CreatePredictTask",
        component: () =>
          import("@/views/AnalyzeCenter/CreatePredictTask/index"), // Parent router-view
        name: "CreatePredictTask",
        meta: { title: "创建任务", icon: "任务", itemHeight: 40 },
      },
      {
        path: "PredictTask",
        component: () => import("@/views/AnalyzeCenter/PredictTask/index"), // Parent router-view
        name: "PredictTask",
        meta: { title: "预测任务管理", icon: "任务", itemHeight: 40 },
      },
    ],
  },
  {
    path: "/SchemeCenter",
    component: Layout,
    redirect: "/SchemeCenter/CreateTask",
    name: "SchemeCenter",
    hidden: true,
    alwaysShow: true,
    meta: {
      title: "规划中心",
      icon: "clipboard",
      itemHeight: 48,
    },
    children: [
      {
        path: "CreateTask",
        component: () => import("@/views/SchemeCenter/CreateTask/index"), // Parent router-view
        name: "CreateTask",
        meta: { title: "创建任务", icon: "任务", itemHeight: 40 },
      },
      {
        path: "ScalingTask",
        component: () => import("@/views/SchemeCenter/ScalingTask/index"), // Parent router-view
        name: "ScalingTask",
        meta: { title: "伸缩任务管理", icon: "伸缩", itemHeight: 40 },
      },
      {
        path: "DeployTask",
        component: () => import("@/views/SchemeCenter/DeployTask/index"), // Parent router-view
        name: "DeployTask",
        meta: { title: "部署任务管理", icon: "部署工作2", itemHeight: 40 },
      },
      {
        path: "MigTask",
        component: () => import("@/views/SchemeCenter/MigTask/index"), // Parent router-view
        name: "MigTask",
        meta: { title: "迁移任务管理", icon: "伸缩", itemHeight: 40 },
      },
      {
        path: "SchedulingTask",
        component: () => import("@/views/SchemeCenter/SchedulingTask/index"), // Parent router-view
        name: "SchedulingTask",
        meta: { title: "调度任务管理", icon: "任务调度", itemHeight: 40 },
      },

      //      {
      //        path: 'SchedulingModels',
      //        component: () => import('@/views/SchemeCenter/SchedulingModels/index'), // Parent router-view
      //        name: 'SchedulingModels',
      //        meta: { title: '调度模型管理', icon: '任务调度' }
      //      },
      //      {
      //        path: 'DeployModels',
      //        component: () => import('@/views/SchemeCenter/DeployModels/index'),
      //        name: 'DeployModels',
      //        meta: { title: '部署模型管理', icon: '部署工作2' }
      //      },
      //      {
      //        path: 'ScalingModels',
      //        component: () => import('@/views/SchemeCenter/ScalingModels/index'),
      //        name: 'ScalingModels',
      //        meta: { title: '伸缩模型管理', icon: '伸缩' }
      //      }
    ],
  },

  //   执行中心模块
  {
    path: "/ExecuteCenter",
    component: Layout,
    redirect: "/ExecuteCenter/OpenFaas",
    name: "ExecuteCenter",
    hidden: true,
    alwaysShow: true,
    meta: {
      title: "执行中心",
      icon: "execute",
      itemHeight: 48,
    },
    children: [
      {
        path: "TaskLog",
        component: () => import("@/views/ExecuteCenter/Tasklog/index"), // Parent router-view
        name: "TaskLog",
        meta: { title: "TaskLog", icon: "任务", itemHeight: 40 },
      },
      {
        path: "OpenFaas",
        component: () => import("@/views/ExecuteCenter/OpenFaas/index"), // Parent router-view
        name: "OpenFaas",
        meta: { title: "OpenFaaS", icon: "openfaas", itemHeight: 40 },
      },
      {
        path: "Prometheus",
        component: () => import("@/views/ExecuteCenter/Prometheus/index"),
        name: "Prometheus",
        meta: { title: "Prometheus", icon: "prometheus", itemHeight: 40 },
      },
      // {
      //   path: 'Grafana',
      //   component: () => import('@/views/ExecuteCenter/Grafana/index'),
      //   name: 'Grafana',
      //   meta: { title: 'Grafana', icon: 'grafana' }
      // },
      // {
      //   path: 'Faas-Flow-Tower',
      //   component: () => import('@/views/ExecuteCenter/Faas-Flow-Tower/index'),
      //   name: 'Faas-Flow-Tower',
      //   meta: { title: 'FaaS-Flow-Tower', icon: 'faas-flow-tower' }
      // },
      // {
      //   path: 'Locust',
      //   component: () => import('@/views/ExecuteCenter/Locust/index'),
      //   name: 'Locust',
      //   meta: { title: 'Locust', icon: 'locust' }
      // }
    ],
  },

  // 模型任务中心模块
  //  {
  //    path: '/ModelTaskCenter',
  //    component: Layout,
  //    redirect: '/ModelTaskCenter/CreateModels',
  //    name: 'ModelTaskCenter',
  //    meta: {
  //      title: '模型任务中心',
  //      icon: 'clipboard'
  //    },
  //    children: [
  //      {
  //        path: 'CreateTasks',
  //        component: () => import('@/views/ModelTaskCenter/CreateTasks/index'),
  //        name: 'CreateTasks',
  //        meta: { title: '创建任务', icon: '任务' }
  //      },
  //      {
  //        path: 'TaskManager',
  //        component: () => import('@/views/ModelTaskCenter/TaskManager/index'),
  //        name: 'TaskManager',
  //        meta: { title: '任务管理', icon: '任务' }
  //      }
  //    ]
  //  },

  // {
  //   path: '/',
  //   component: Layout,
  //   redirect: '/dashboard',
  //   children: [{
  //     path: 'dashboard',
  //     name: 'Dashboard',
  //     component: () => import('@/views/dashboard/index'),
  //     meta: { title: 'OpenFaas服务模块', icon: 'dashboard' }
  //   }]
  // },

  // {
  //   path: '/example',
  //   component: Layout,
  //   redirect: '/example/table',
  //   children: [
  //     {
  //       path: 'table',
  //       name: 'Table',
  //       component: () => import('@/views/table/index'),
  //       meta: { title: '函数展示', icon: 'table' }
  //     }
  //   ]
  // },

  /*
  {
    path: '/form',
    component: Layout,
    children: [
      {
        path: 'index',
        name: 'Form',
        component: () => import('@/views/form/index'),
        meta: { title: 'Form', icon: 'form' }
      }
    ]
  },

  {
    path: '/nested',
    component: Layout,
    redirect: '/nested/menu1',
    name: 'Nested',
    meta: {
      title: 'Nested',
      icon: 'nested'
    },
    children: [
      {
        path: 'menu1',
        component: () => import('@/views/nested/menu1/index'), // Parent router-view
        name: 'Menu1',
        meta: { title: 'Menu1' },
        children: [
          {
            path: 'menu1-1',
            component: () => import('@/views/nested/menu1/menu1-1'),
            name: 'Menu1-1',
            meta: { title: 'Menu1-1' }
          },
          {
            path: 'menu1-2',
            component: () => import('@/views/nested/menu1/menu1-2'),
            name: 'Menu1-2',
            meta: { title: 'Menu1-2' },
            children: [
              {
                path: 'menu1-2-1',
                component: () => import('@/views/nested/menu1/menu1-2/menu1-2-1'),
                name: 'Menu1-2-1',
                meta: { title: 'Menu1-2-1' }
              },
              {
                path: 'menu1-2-2',
                component: () => import('@/views/nested/menu1/menu1-2/menu1-2-2'),
                name: 'Menu1-2-2',
                meta: { title: 'Menu1-2-2' }
              }
            ]
          },
          {
            path: 'menu1-3',
            component: () => import('@/views/nested/menu1/menu1-3'),
            name: 'Menu1-3',
            meta: { title: 'Menu1-3' }
          }
        ]
      },
      {
        path: 'menu2',
        component: () => import('@/views/nested/menu2/index'),
        name: 'Menu2',
        meta: { title: 'menu2' }
      }
    ]
  },*/

  // {
  //   path: '/container',
  //   component: Layout,
  //   children: [
  //     {
  //       path: 'index',
  //       name: 'Container',
  //       component: () => import('@/views/container/index'),
  //       meta: { title: '容器模块', icon: 'form' }
  //     }
  //   ]
  // },

  // {
  //   path: '/node',
  //   component: Layout,
  //   children: [
  //     {
  //       path: 'index',
  //       name: 'Node',
  //       component: () => import('@/views/node/index'),
  //       meta: { title: '服务器模块', icon: 'nested' }
  //     }
  //   ]
  // },

  // 当前产品导航按实际业务流程组织。历史 URL 在下方保留重定向。
  {
    path: '/workspace',
    component: Layout,
    children: [{
      path: '',
      name: 'Workspace',
      component: () => import('@/views/Workspace/index'),
      meta: { title: '工作台', icon: 'dashboard', itemHeight: 48 }
    }]
  },
  {
    path: '/resources',
    component: Layout,
    redirect: '/resources/nodes',
    name: 'ResourceCenter',
    alwaysShow: true,
    meta: { title: '资源与数据', icon: 'clipboard', itemHeight: 48 },
    children: [
      { path: 'nodes', name: 'NodeRegistry', component: () => import('@/views/RegistrationCenter/NodeRegistry/index'), meta: { title: '节点资源', icon: 'server', itemHeight: 40 }},
      { path: 'network', name: 'Settings', component: () => import('@/views/ManagementCenter/Settings/index'), meta: { title: '网络配置', icon: 'edit', itemHeight: 40 }},
      { path: 'topology', name: 'FrameNet', component: () => import('@/views/ManagementCenter/FrameNet/index'), meta: { title: '网络拓扑', icon: 'cluster', itemHeight: 40 }},
      { path: 'datasets/register', name: 'DatasetRegistry', component: process.env.VUE_APP_DEMO_MODE === 'true' ? () => import('@/views/RegistrationCenter/DatasetRegistry/MockPreview') : () => import('@/views/RegistrationCenter/DatasetRegistry/index'), meta: { title: '数据集注册', icon: 'documentation', itemHeight: 40 }},
      { path: 'datasets/manage', name: 'DataManagement', component: () => import('@/views/ManagementCenter/DataManagement/index'), meta: { title: '数据集管理', icon: 'clipboard', itemHeight: 40 }},
      { path: 'runtime-images', name: 'RuntimeImageRegistry', component: () => import('@/views/RegistrationCenter/RuntimeImageRegistry/index'), meta: { title: '运行镜像', icon: 'form', itemHeight: 40 }}
    ]
  },
  {
    path: '/collaboration',
    component: Layout,
    redirect: '/collaboration/capabilities',
    name: 'CollaborationCenter',
    hidden: true,
    alwaysShow: true,
    meta: { title: '协同计算', icon: 'lock', itemHeight: 48 },
    children: [
      { path: 'capabilities', name: 'PrivacyCapabilities', component: () => import('@/views/ManagementCenter/PrivacyComputing/index'), meta: { title: '能力说明', icon: 'documentation', itemHeight: 40, privacyTab: 'capabilities' }},
      { path: 'jobs/new', name: 'PrivacyJobCreate', component: () => import('@/views/ManagementCenter/PrivacyComputing/index'), meta: { title: '发起计算', icon: 'edit', itemHeight: 40, privacyTab: 'create', roles: ['DATA_OWNER'] }},
      { path: 'approvals', name: 'PrivacyApprovals', component: () => import('@/views/ManagementCenter/PrivacyComputing/index'), meta: { title: '待我审批', icon: 'message', itemHeight: 40, privacyTab: 'approvals', roles: ['DATA_OWNER'] }},
      { path: 'jobs', name: 'PrivacyJobs', component: () => import('@/views/ManagementCenter/PrivacyComputing/index'), meta: { title: '全部任务', icon: 'nested', itemHeight: 40, privacyTab: 'jobs' }},
      { path: 'jobs/:jobId', name: 'PrivacyJobDetail', hidden: true, component: () => import('@/views/ManagementCenter/PrivacyComputing/index'), meta: { title: '任务详情', activeMenu: '/collaboration/jobs', privacyTab: 'jobs' }}
    ]
  },
  {
    path: '/operations',
    component: Layout,
    redirect: '/operations/data-selection',
    name: 'OperationsCenter',
    alwaysShow: true,
    meta: { title: '任务运行', icon: 'nested', itemHeight: 48 },
    children: [
      { path: 'data-selection', name: 'SelectData', component: () => import('@/views/ManagementCenter/SelectData/index'), meta: { title: '数据选择', icon: 'nested', itemHeight: 40 }},
      { path: 'tasks', name: 'TaskList', component: () => import('@/views/ManagementCenter/TaskList/index'), meta: { title: '任务列表', icon: 'documentation', itemHeight: 40 }},
      { path: 'schedules', name: 'Schedule', component: () => import('@/views/ManagementCenter/Schedule/index'), meta: { title: '调度结果', icon: 'documentation', itemHeight: 40 }},
      { path: 'analysis', name: 'Analyze', component: () => import('@/views/ManagementCenter/Analyze/index'), meta: { title: '性能分析', icon: 'form', itemHeight: 40 }}
    ]
  },
  {
    path: '/security',
    component: Layout,
    redirect: '/security/access',
    name: 'SecurityCenter',
    alwaysShow: true,
    meta: { title: '安全中心', icon: 'lock', itemHeight: 48 },
    children: [
      { path: 'access', name: 'AccessControl', component: () => import('@/views/SecurityCenter/AccessControl/index'), meta: { title: '访问控制', icon: 'password', itemHeight: 40 }},
      { path: 'admin', name: 'SystemAdministration', component: () => import('@/views/AdminCenter/index'), meta: { title: '系统管理', icon: 'people', itemHeight: 40, roles: ['ADMIN'] }}
    ]
  },
  {
    path: '/logs',
    component: Layout,
    redirect: '/logs/scheduling',
    name: 'SystemLogs',
    alwaysShow: true,
    meta: { title: '系统日志', icon: 'documentation', itemHeight: 48 },
    children: [
      { path: 'scheduling', name: 'SchedulingLogs', component: () => import('@/views/ManagementCenter/SchedulingLogs/index'), meta: { title: '调度执行日志', icon: 'documentation', itemHeight: 40 }},
      { path: 'abnormal-access', name: 'SecurityValidation', component: () => import('@/views/ManagementCenter/SecurityValidation/index'), meta: { title: '异常访问日志', icon: 'form', itemHeight: 40 }},
      { path: 'privacy', name: 'PrivacyLogs', hidden: true, component: () => import('@/views/ManagementCenter/PrivacyComputing/index'), meta: { title: '隐私计算日志', icon: 'lock', itemHeight: 40, privacyTab: 'jobs', evidenceMode: true }}
    ]
  },
  {
    path: '/support',
    component: Layout,
    redirect: '/support/external-api',
    name: 'SystemSupport',
    alwaysShow: true,
    meta: { title: '系统支持', icon: 'documentation', itemHeight: 48 },
    children: [
      { path: 'external-api', name: 'ExternalApi', component: () => import('@/views/HelpCenter/ExternalApi/index'), meta: { title: '对外接口', icon: 'documentation', itemHeight: 40 }}
    ]
  },

  // 兼容已有书签和外部链接；规范页面只使用上面的业务路由。
  { path: '/RegistrationCenter', redirect: '/resources/nodes', hidden: true },
  { path: '/RegistrationCenter/NodeRegistry', redirect: to => ({ path: '/resources/nodes', query: to.query, hash: to.hash }), hidden: true },
  { path: '/RegistrationCenter/DatasetRegistry', redirect: to => ({ path: '/resources/datasets/register', query: to.query, hash: to.hash }), hidden: true },
  { path: '/RegistrationCenter/RuntimeImageRegistry', redirect: to => ({ path: '/resources/runtime-images', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter', redirect: '/resources/network', hidden: true },
  { path: '/NetworkCenter', redirect: '/resources/network', hidden: true },
  { path: '/DataCenter', redirect: '/resources/datasets/manage', hidden: true },
  { path: '/TaskCenter', redirect: '/operations/data-selection', hidden: true },
  { path: '/HelpCenter', redirect: '/support/external-api', hidden: true },
  { path: '/HelpCenter/ExternalApi', redirect: to => ({ path: '/support/external-api', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/Settings', redirect: to => ({ path: '/resources/network', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/FrameNet', redirect: to => ({ path: '/resources/topology', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/DataManagement', redirect: to => ({ path: '/resources/datasets/manage', query: to.query, hash: to.hash }), hidden: true },
  { path: '/admin', redirect: '/security/admin', hidden: true },
  { path: '/admin/domains', redirect: to => ({ path: '/security/admin', query: { ...to.query, tab: 'domains' }, hash: to.hash }), hidden: true },
  { path: '/admin/users', redirect: to => ({ path: '/security/admin', query: { ...to.query, tab: 'users' }, hash: to.hash }), hidden: true },
  { path: '/admin/dataset-owners', redirect: to => ({ path: '/security/admin', query: { ...to.query, tab: 'datasets' }, hash: to.hash }), hidden: true },
  { path: '/DataCenter/SchedulingLogs', redirect: to => ({ path: '/logs/scheduling', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/PrivacyComputing', redirect: to => ({ path: '/collaboration/capabilities', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/SecurityValidation', redirect: to => ({ path: '/logs/abnormal-access', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/SelectData', redirect: to => ({ path: '/operations/data-selection', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/TaskList', redirect: to => ({ path: '/operations/tasks', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/Schedule', redirect: to => ({ path: '/operations/schedules', query: to.query, hash: to.hash }), hidden: true },
  { path: '/ManagementCenter/Analyze', redirect: to => ({ path: '/operations/analysis', query: to.query, hash: to.hash }), hidden: true },


  // 404 page must be placed at the end !!!
  { path: "*", redirect: "/404", hidden: true },
];

const createRouter = () =>
  new Router({
    // mode: 'history', // require service support
    mode: "hash", // require service support
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes,
  });

const router = createRouter();

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter();
  router.matcher = newRouter.matcher; // reset router
}

export default router;
