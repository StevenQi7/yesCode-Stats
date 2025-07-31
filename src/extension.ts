import * as vscode from 'vscode';
import { StatsProvider } from './providers/statsProvider';
import { ApiService } from './services/apiService';
import { StatusBarManager } from './ui/statusBarManager';

let statusBarManager: StatusBarManager | undefined;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('yesCode 使用统计插件已激活！');

    const apiService = new ApiService(context);
    const statsProvider = new StatsProvider(apiService);
    statusBarManager = new StatusBarManager();

    const treeView = vscode.window.createTreeView('yescodeStats', {
        treeDataProvider: statsProvider,
        showCollapseAll: false
    });

    context.subscriptions.push(treeView);

    const refreshCommand = vscode.commands.registerCommand('yescode-stats.refresh', async () => {
        await refreshStats(apiService, statsProvider, statusBarManager);
    });

    const configureCommand = vscode.commands.registerCommand('yescode-stats.configure', async () => {
        const options = ['设置 API Token', '设置 API 地址', '设置刷新周期', '设置每日订阅额度'];
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: '请选择要配置的选项'
        });

        const config = vscode.workspace.getConfiguration('yescode-stats');

        switch (selected) {
            case '设置 API Token':
                // 从密钥库获取当前值
                const currentKey = await context.secrets.get('yescode-stats.apiKey') || '';
                const apiKey = await vscode.window.showInputBox({
                    prompt: '请输入你的 yesCode API Token',
                    password: true,
                    placeHolder: 'cr_xxxxxxxxxxxxxxx',
                    value: currentKey
                });

                if (apiKey !== undefined) {
                    await apiService.setApiKey(apiKey);
                    vscode.window.showInformationMessage('API Token 已安全保存到密钥库！');
                    await refreshStats(apiService, statsProvider, statusBarManager);
                }
                break;

            case '设置 API 地址':
                const endpoint = await vscode.window.showInputBox({
                    prompt: '请输入 API 地址',
                    placeHolder: 'https://co.yes.vg/api/v1/claude/balance',
                    value: config.get<string>('apiEndpoint', 'https://co.yes.vg/api/v1/claude/balance')
                });

                if (endpoint) {
                    await config.update('apiEndpoint', endpoint, true);
                    vscode.window.showInformationMessage('API 地址更新成功！');
                    await refreshStats(apiService, statsProvider, statusBarManager);
                }
                break;

            case '设置刷新周期':
                const intervalOptions = [
                    { label: '10秒', value: 10 },
                    { label: '30秒', value: 30 },
                    { label: '1分钟', value: 60 },
                    { label: '5分钟', value: 300 },
                    { label: '30分钟', value: 1800 }
                ];
                
                const selectedInterval = await vscode.window.showQuickPick(intervalOptions, {
                    placeHolder: '请选择刷新周期'
                });

                if (selectedInterval) {
                    await config.update('refreshInterval', selectedInterval.value, true);
                    vscode.window.showInformationMessage(`刷新周期已设置为 ${selectedInterval.label}`);
                    startAutoRefresh(apiService, statsProvider, statusBarManager);
                }
                break;

            case '设置每日订阅额度':
                const dailyLimit = await vscode.window.showInputBox({
                    prompt: '请输入每日订阅额度（用于计算当天订阅使用百分比）',
                    placeHolder: '100',
                    value: config.get<number>('dailySubscriptionLimit', 100).toString(),
                    validateInput: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num) || num <= 0) {
                            return '请输入一个大于0的数字';
                        }
                        return null;
                    }
                });

                if (dailyLimit) {
                    await config.update('dailySubscriptionLimit', parseFloat(dailyLimit), true);
                    vscode.window.showInformationMessage('每日订阅额度更新成功！');
                    await refreshStats(apiService, statsProvider, statusBarManager);
                }
                break;
        }
    });

    context.subscriptions.push(refreshCommand);
    context.subscriptions.push(configureCommand);
    context.subscriptions.push(statusBarManager);

    // 等待配置加载完成
    await apiService.loadConfig();
    
    // 检查是否需要初始设置
    const needsSetup = await checkInitialSetup(context, apiService);
    if (needsSetup) {
        await runInitialSetup(context, apiService, statsProvider, statusBarManager);
    } else {
        await refreshStats(apiService, statsProvider, statusBarManager);
        startAutoRefresh(apiService, statsProvider, statusBarManager);
    }

    context.subscriptions.push({
        dispose: () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        }
    });
}

async function refreshStats(apiService: ApiService, statsProvider: StatsProvider, statusBarManager: StatusBarManager | undefined) {
    try {
        const stats = await apiService.fetchBalance();
        if (stats) {
            statsProvider.refresh(stats);
            statusBarManager?.update(stats);
        }
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`获取数据失败: ${error.message}`);
        }
    }
}

function startAutoRefresh(apiService: ApiService, statsProvider: StatsProvider, statusBarManager: StatusBarManager | undefined) {
    const config = vscode.workspace.getConfiguration('yescode-stats');
    const interval = config.get<number>('refreshInterval', 300) * 1000;

    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
        refreshStats(apiService, statsProvider, statusBarManager);
    }, interval);
}

async function checkInitialSetup(context: vscode.ExtensionContext, apiService: ApiService): Promise<boolean> {
    const apiKey = await context.secrets.get('yescode-stats.apiKey');
    const hasSeenSetup = context.globalState.get<boolean>('yescode-stats.hasSeenSetup', false);
    
    // 如果没有API Key且没有看过设置引导，则需要初始设置
    return !apiKey && !hasSeenSetup;
}

async function runInitialSetup(
    context: vscode.ExtensionContext, 
    apiService: ApiService, 
    statsProvider: StatsProvider, 
    statusBarManager: StatusBarManager | undefined
) {
    const setupResult = await vscode.window.showInformationMessage(
        '欢迎使用 yesCode 使用统计插件！需要进行初始设置。',
        '开始设置',
        '稍后设置'
    );
    
    if (setupResult !== '开始设置') {
        // 只有在用户选择"稍后设置"时才标记已看过设置引导
        await context.globalState.update('yescode-stats.hasSeenSetup', true);
        vscode.window.showInformationMessage('你可以稍后通过点击侧边栏的设置按钮或使用命令 "yesCode: 设置" 进行配置。');
        return;
    }
    
    // 设置 API Token
    const apiKey = await vscode.window.showInputBox({
        prompt: '请输入你的 yesCode API Token',
        password: true,
        placeHolder: 'cr_xxxxxxxxxxxxxxx',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return '请输入 API Token';
            }
            if (!value.startsWith('cr_')) {
                return 'API Token 应该以 cr_ 开头';
            }
            return null;
        }
    });
    
    if (!apiKey) {
        vscode.window.showWarningMessage('设置已取消。你可以稍后通过命令 "yesCode: 设置" 进行配置。');
        // 用户取消了设置，不标记 hasSeenSetup，下次还会弹出
        return;
    }
    
    await apiService.setApiKey(apiKey);
    
    // 设置每日订阅额度
    const dailyLimit = await vscode.window.showInputBox({
        prompt: '请输入每日订阅额度（美元）',
        placeHolder: '100',
        value: '100',
        ignoreFocusOut: true,
        validateInput: (value) => {
            const num = parseFloat(value);
            if (isNaN(num) || num <= 0) {
                return '请输入一个大于0的数字';
            }
            return null;
        }
    });
    
    if (!dailyLimit) {
        vscode.window.showInformationMessage('使用默认每日额度 $100。');
    } else {
        const config = vscode.workspace.getConfiguration('yescode-stats');
        await config.update('dailySubscriptionLimit', parseFloat(dailyLimit), true);
    }
    
    vscode.window.showInformationMessage('设置完成！开始获取使用统计数据...');
    
    // 只要设置了 API Key 就标记为已完成设置
    await context.globalState.update('yescode-stats.hasSeenSetup', true);
    
    // 设置完成后刷新数据
    await refreshStats(apiService, statsProvider, statusBarManager);
    startAutoRefresh(apiService, statsProvider, statusBarManager);
}

export function deactivate() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}