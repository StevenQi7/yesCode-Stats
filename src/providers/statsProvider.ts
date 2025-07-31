import * as vscode from 'vscode';
import { ApiService } from '../services/apiService';
import { Stats } from '../models/stats';

export class StatsProvider implements vscode.TreeDataProvider<StatsItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatsItem | undefined | null | void> = new vscode.EventEmitter<StatsItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatsItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private stats: Stats | null = null;

    constructor(private apiService: ApiService) {}

    refresh(stats: Stats): void {
        this.stats = stats;
        this._onDidChangeTreeData.fire();
    }

    private getProgressBar(percentage: number): string {
        const width = 10;
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    getTreeItem(element: StatsItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatsItem): Thenable<StatsItem[]> {
        if (!this.stats) {
            return Promise.resolve([
                new StatsItem('暂无数据', '请点击设置按钮配置', vscode.TreeItemCollapsibleState.None, 'warning')
            ]);
        }

        if (!element) {
            return Promise.resolve([
                new StatsItem(
                    '总余额',
                    `$${this.stats.totalBalance.toFixed(2)}`,
                    vscode.TreeItemCollapsibleState.None,
                    'account'
                ),
                new StatsItem(
                    '订阅余额',
                    `$${this.stats.subscriptionBalance.toFixed(2)}`,
                    vscode.TreeItemCollapsibleState.None,
                    'credit-card'
                ),
                new StatsItem(
                    '按需付费余额',
                    `$${this.stats.payAsYouGoBalance.toFixed(2)}`,
                    vscode.TreeItemCollapsibleState.None,
                    'tag'
                ),
                new StatsItem(
                    '订阅使用量',
                    `${this.stats.subscriptionUsagePercentage.toFixed(1)}% ${this.getProgressBar(this.stats.subscriptionUsagePercentage)}`,
                    vscode.TreeItemCollapsibleState.None,
                    'graph'
                ),
                new StatsItem(
                    '更新时间',
                    this.stats.lastUpdated.toLocaleTimeString('zh-CN'),
                    vscode.TreeItemCollapsibleState.None,
                    'clock'
                )
            ]);
        }

        return Promise.resolve([]);
    }
}

class StatsItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private icon: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}: ${this.value}`;
        this.description = this.value;
        this.iconPath = new vscode.ThemeIcon(this.icon);
        
        if (this.label === '订阅使用量') {
            const usage = parseFloat(this.value);
            if (usage > 90) {
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
            } else if (usage > 80) {
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
            }
        }
    }
}