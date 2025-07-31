import * as vscode from 'vscode';
import { Stats } from '../models/stats';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'yescode-stats.refresh';
        this.statusBarItem.tooltip = '点击刷新 yesCode 统计数据';
        this.statusBarItem.show();
    }

    update(stats: Stats) {
        const totalBalance = stats.totalBalance.toFixed(2);
        const subscriptionUsage = stats.subscriptionUsagePercentage.toFixed(1);
        
        this.statusBarItem.text = `$(cloud) yesCode: $${totalBalance} (订阅已用${subscriptionUsage}%)`;
        
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.appendMarkdown(`### yesCode 使用统计\n\n`);
        tooltip.appendMarkdown(`**总余额:** $${totalBalance}\n\n`);
        tooltip.appendMarkdown(`**订阅余额:** $${stats.subscriptionBalance.toFixed(2)}\n\n`);
        tooltip.appendMarkdown(`**按需付费:** $${stats.payAsYouGoBalance.toFixed(2)}\n\n`);
        tooltip.appendMarkdown(`**订阅使用量:** ${subscriptionUsage}%\n\n`);
        tooltip.appendMarkdown(`**更新时间:** ${stats.lastUpdated.toLocaleTimeString('zh-CN')}\n\n`);
        tooltip.appendMarkdown(`*点击刷新数据*`);
        
        this.statusBarItem.tooltip = tooltip;
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}