import { ApiResponse } from '@/app/lib/apiResponse';

export interface IHoliday {
    _id: string;
    date: string;
    calendar: "default" | "other";
    categories: {
        public: boolean;
        mercantile: boolean;
        bank: boolean;
    };
    summary: string;
}

export const getHolidays = async (startDate?: string, endDate?: string, calendar: string = "default"): Promise<ApiResponse<IHoliday[]>> => {
    let url = `/api/holidays?calendar=${calendar}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url);
    return response.json();
};
