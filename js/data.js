/* KyFold · data.js
   页面静态数据：FAQ、产品信息、产品流程、账户面板定义、情景与帮助筛选状态。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

  const panels = [ ['overview','grid','账户概览'], ['identities','link','登录与绑定'], ['security','shield','设备与安全'], ['preferences','settings','偏好设置'] ];
  let activeScene = 'remote';
  let helpQuery = '';
  let helpCategory = 'all';
  const faqItems = [
    {id:'color-studio',group:'preview',q:'调色工作台需要登录吗？配色怎么保存？',a:'Color Studio 无需登录，颜色与画笔在当前浏览器中编辑。重要配色请点击“保存配色”另存工程，下次可以重新导入。高光与颗粒可以独立调节，支持 SVG、PNG 和完整素材包导出。工作台右上角也提供离线 HTML。'},
    {id:'studio-export',group:'preview',q:'SVG、PNG 和素材包该怎么选？',a:'透明 K · SVG 适合继续编辑矢量轮廓，但不包含颗粒和画笔背景。完整 PNG 保留图标的视觉效果；完整素材包还包含背景和细节层。想以后继续改颜色，请另外保存可导入的配色工程。'},
    {id:'brand',group:'product',q:'KyFold 是什么？',a:'KyFold 是 KyRemote、课堂 AI 助手等工具共同的软件品牌。它们围绕不同的使用场景独立开发；官网用于了解产品，统一账户则是正在设计中的共同身份入口。'},
    {id:'independent',group:'product',q:'需要同时使用两款 App 吗？',a:'不需要。远程工作选择 KyRemote，课堂学习选择课堂 AI 助手。你可以只使用需要的那一款，它们不需要合并成一个 App。'},
    {id:'release',group:'product',q:'现在可以下载 App 吗？',a:'两款产品目前都处于开发与测试阶段，尚未在这份官网预览中提供公开下载。页面中的界面为功能示意，实际功能与支持设备以发布时的说明为准。'},
    {id:'mac',group:'product',q:'KyRemote 需要一台 Mac 吗？',a:'当前设计面向运行 DSH 的 Mac，并在 iPhone 或 iPad 上查看和继续会话。Mac 端需要保持运行与可连接；具体连接和授权方式会随产品完善。'},
    {id:'classroom',group:'product',q:'课堂助手会一直录音吗？',a:'当前的产品方向是由你手动开启和停止课堂监听，并明确显示正在听课的状态。实际录音、后台运行和转写能力仍需以设备测试与最终版本为准。'},
    {id:'answers',group:'product',q:'AI 回答可以直接当作正确答案吗？',a:'不建议。课堂助手的目标是提供简答与思路提示，仍需要结合课程内容核对。缺少课件或图片时，应补充题目信息；不可靠的回答需要清楚提醒。'},
    {id:'identity',group:'account',q:'一个 KyFold 账户，和多个登录方式有什么关系？',a:'KyFold 账户是你的共同身份。GitHub、Google、Apple 或邮箱可以作为同一个身份的不同登录入口；统一账户目前还处于界面设计阶段。'},
    {id:'binding',group:'account',q:'如何把已有账户和 Google、GitHub 关联？',a:'设计流程是先登录 KyFold，再进入“登录与绑定”，验证并添加另一种登录方式。新增入口应关联到当前身份。预览中的绑定只是模拟，不会连接真实的第三方账户。'},
    {id:'data',group:'account',q:'统一账户，会把两个 App 的内容混在一起吗？',a:'不会因为身份统一就自动合并所有内容。远程设备授权、课堂记录和各产品的使用权限应分别管理；具体的数据规则会在实际接入后说明。'},
    {id:'unbind',group:'account',q:'解绑后，KyFold 账户会被删除吗？',a:'解绑只移除一个登录入口，不等于删除 KyFold 账户。预览会要求至少保留一种可用的登录方式；正式服务也需要在验证身份后处理这类操作。'},
    {id:'preview',group:'preview',q:'这份网页里，哪些操作可以体验？',a:'你可以切换使用情境、浏览产品流程、搜索帮助，以及体验模拟登录、绑定、昵称修改和设备管理。当前没有真实 OAuth、设备连接、邮件发送或云端同步。'},
    {id:'storage',group:'preview',q:'预览里的资料保存在哪里？',a:'演示昵称、登录方式、示例设备和外观偏好只保存在当前浏览器。邮箱表单不会保存输入的邮箱。账户中心“设备与安全”中的“重置演示数据”可以恢复初始演示状态。'}
  ];
  const productStories = {
    kyremote:{stepsTitle:'三步，把进度接回手边。',steps:[['准备好 Mac','让运行 DSH 的 Mac 保持可连接，桌面的工作是会话的来源。'],['找到工作区','在 iPhone 或 iPad 上选择自己的设备，再进入对应项目。'],['继续这段对话','查看已有上下文，补充想法，让工作接着往下走。']],specs:[['移动端','面向 iPhone 与 iPad'],['工作来源','运行 DSH 的 Mac'],['使用场景','查看进度、浏览会话、继续对话'],['当前阶段','开发与测试，暂未公开下载']],faqIds:['mac','independent','release'],focus:'把注意力留给会话。',focusText:'从移动设备找到项目、读懂上下文，再发送下一条消息。KyRemote 围绕远程 Agent 工作设计，让小屏幕上的常用操作更清楚。'},
    classroom:{stepsTitle:'跟着课堂，一步一步来。',steps:[['手动开始听课','在需要时开启监听，清楚看到当前的听课状态。'],['抓住那个问题','从课堂文字中发现提问，先看简答，再看一句话原因。'],['补全信息，再核对','依赖课件时补充照片；遇到不可靠的回答，回到课程内容核对。']],specs:[['主要设备','优先为 iPad 设计'],['课堂输入','语音转写与补充照片'],['辅助内容','提问提示、简答与原因'],['当前阶段','开发与测试，能力验证中']],faqIds:['classroom','answers','release'],focus:'先听懂，再给一点帮助。',focusText:'课堂里的问题不总是完整的文字。除了转写与简答，产品也在围绕提问提示、补充视觉信息和回答可靠性提醒继续打磨。'}
  };
  const products = {
    kyremote:{name:'KyRemote',symbol:'monitor',tagline:'把工作，<br>带到手边。',description:'离开桌面，思路不用停。在 iPhone 和 iPad 上，连接 Mac 中的 DSH，接着查看项目、发送消息，与 Agent 一起把工作继续下去。',platform:'iPhone · iPad · 连接你的 Mac',features:[['laptop','连接自己的 Mac','选择设备并确认连接，在移动设备上继续桌面的工作。'],['folder','熟悉的工作空间','按工作区找到对话，让项目与上下文更容易接上。'],['message','继续与 Agent 对话','查看会话、发送消息，关注手边任务的进展。']]},
    classroom:{name:'课堂 AI 助手',symbol:'book',tagline:'专心听课，<br>也跟得上提问。',description:'面向 iPad 的课堂辅助工具。围绕实时语音转写、提问识别与 AI 辅助回答展开，让听课时需要帮助的那一刻，有一个清楚的入口。',platform:'优先为 iPad 设计',features:[['mic','课堂语音转写','手动开启与停止听课，保留可查看的课堂文字内容。'],['message','识别课堂提问','识别提问并辅助组织简答；回答仍需结合课程内容核对。'],['camera','补充视觉信息','在题意依赖课件或图片时补充照片，是正在完善的方向。']]}
  };
