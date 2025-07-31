export interface BalanceResponse {
    balance: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    pay_as_you_go_balance: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    subscription_balance: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    total_balance: number;
}

export interface Stats {
    totalBalance: number;
    subscriptionBalance: number;
    payAsYouGoBalance: number;
    subscriptionUsagePercentage: number;
    lastUpdated: Date;
}