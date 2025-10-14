import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/app/lib/db";
import Company from "@/app/models/Company";
import Employee from "@/app/models/Employee";
import Salary from "@/app/models/Salary";
import LeaveRequest from "@/app/models/LeaveRequest";
import Department from "@/app/models/Department";

export const dynamic = "force-dynamic";

// GET /api/dashboard/employer?companyId=xxx (or companyId=all for all companies)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role === "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Build company filter
    let companyFilter: any = {};
    if (session.user.role !== "admin") {
      companyFilter.user = session.user.id;
    }

    let companies: any[];
    if (companyId === "all") {
      companies = await Company.find(companyFilter)
        .select("_id name employerNo")
        .lean();
    } else {
      companyFilter._id = companyId;
      const company = await Company.findOne(companyFilter)
        .select("_id name employerNo")
        .lean();
      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      companies = [company];
    }

    const companyIds = companies.map((c) => c._id);

    // Parallel data fetching for performance
    const [
      employeeStats,
      employeesByType,
      departmentStats,
      recentSalaries,
      leaveStats,
      salaryTrends,
    ] = await Promise.all([
      // Employee statistics
      Employee.aggregate([
        { $match: { company: { $in: companyIds } } },
        {
          $group: {
            _id: "$company",
            total: { $sum: 1 },
            active: { $sum: { $cond: ["$active", 1, 0] } },
            inactive: { $sum: { $cond: ["$active", 0, 1] } },
            canLogin: { $sum: { $cond: ["$canLogin", 1, 0] } },
          },
        },
      ]),

      // Employees by type
      Employee.aggregate([
        { $match: { company: { $in: companyIds }, active: true } },
        {
          $group: {
            _id: { company: "$company", type: "$employeeType" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Department statistics
      Department.aggregate([
        { $match: { company: { $in: companyIds }, isActive: true } },
        {
          $lookup: {
            from: "employees",
            localField: "_id",
            foreignField: "department",
            as: "employees",
          },
        },
        {
          $project: {
            company: 1,
            name: 1,
            employeeCount: { $size: "$employees" },
          },
        },
        {
          $group: {
            _id: "$company",
            departments: { $push: { name: "$name", count: "$employeeCount" } },
            totalDepartments: { $sum: 1 },
          },
        },
      ]),

      // Recent salaries (last 3 months)
      Salary.aggregate([
        {
          $lookup: {
            from: "employees",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData",
          },
        },
        { $unwind: "$employeeData" },
        {
          $match: {
            "employeeData.company": { $in: companyIds },
            period: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
                .toISOString()
                .slice(0, 7),
            },
          },
        },
        {
          $group: {
            _id: { company: "$employeeData.company", period: "$period" },
            avgSalary: { $avg: "$finalSalary" },
            totalSalary: { $sum: "$finalSalary" },
            count: { $sum: 1 },
            minSalary: { $min: "$finalSalary" },
            maxSalary: { $max: "$finalSalary" },
          },
        },
        { $sort: { "_id.period": -1 } },
      ]),

      // Leave statistics
      LeaveRequest.aggregate([
        {
          $lookup: {
            from: "employees",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData",
          },
        },
        { $unwind: "$employeeData" },
        { $match: { "employeeData.company": { $in: companyIds } } },
        {
          $group: {
            _id: {
              company: "$employeeData.company",
              status: "$status",
            },
            count: { $sum: 1 },
            totalDays: { $sum: "$totalDays" },
          },
        },
      ]),

      // Salary trends (last 6 months)
      Salary.aggregate([
        {
          $lookup: {
            from: "employees",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData",
          },
        },
        { $unwind: "$employeeData" },
        {
          $match: {
            "employeeData.company": { $in: companyIds },
            period: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                .toISOString()
                .slice(0, 7),
            },
          },
        },
        {
          $group: {
            _id: { company: "$employeeData.company", period: "$period" },
            avgSalary: { $avg: "$finalSalary" },
            totalPayroll: { $sum: "$finalSalary" },
            employeeCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.period": 1 } },
      ]),
    ]);

    // Format response data
    const dashboard = companies.map((company) => {
      const companyId = company._id.toString();

      // Employee stats for this company
      const empStats = employeeStats.find(
        (s) => s._id.toString() === companyId
      ) || {
        total: 0,
        active: 0,
        inactive: 0,
        canLogin: 0,
      };

      // Employee types for this company
      const empTypes = employeesByType
        .filter((t) => t._id.company.toString() === companyId)
        .reduce((acc, curr) => {
          acc[curr._id.type || "permanent"] = curr.count;
          return acc;
        }, {} as Record<string, number>);

      // Department stats for this company
      const deptStats = departmentStats.find(
        (d) => d._id.toString() === companyId
      ) || {
        departments: [],
        totalDepartments: 0,
      };

      // Salary data for this company
      const salaries = recentSalaries.filter(
        (s) => s._id.company.toString() === companyId
      );

      // Leave data for this company
      const leaves = leaveStats
        .filter((l) => l._id.company.toString() === companyId)
        .reduce((acc, curr) => {
          acc[curr._id.status] = {
            count: curr.count,
            totalDays: curr.totalDays,
          };
          return acc;
        }, {} as Record<string, { count: number; totalDays: number }>);

      // Salary trends for this company
      const trends = salaryTrends
        .filter((t) => t._id.company.toString() === companyId)
        .map((t) => ({
          period: t._id.period,
          avgSalary: Math.round(t.avgSalary),
          totalPayroll: Math.round(t.totalPayroll),
          employeeCount: t.employeeCount,
        }));

      return {
        company: {
          _id: company._id,
          name: company.name,
          employerNo: company.employerNo,
        },
        employees: {
          total: empStats.total,
          active: empStats.active,
          inactive: empStats.inactive,
          canLogin: empStats.canLogin,
          byType: empTypes,
        },
        departments: {
          total: deptStats.totalDepartments,
          list: deptStats.departments.slice(0, 10), // Top 10 departments
        },
        salaries: {
          recent: salaries.map((s) => ({
            period: s._id.period,
            avg: Math.round(s.avgSalary),
            total: Math.round(s.totalSalary),
            count: s.count,
            min: Math.round(s.minSalary),
            max: Math.round(s.maxSalary),
          })),
          trends,
        },
        leaves: {
          pending: leaves.pending || { count: 0, totalDays: 0 },
          approved: leaves.approved || { count: 0, totalDays: 0 },
          rejected: leaves.rejected || { count: 0, totalDays: 0 },
          cancelled: leaves.cancelled || { count: 0, totalDays: 0 },
        },
      };
    });

    // If single company, return just that company's data
    if (companyId !== "all") {
      return NextResponse.json({ dashboard: dashboard[0] }, { status: 200 });
    }

    // For "all" companies, also include aggregated totals
    const aggregated = {
      totalEmployees: dashboard.reduce((sum, d) => sum + d.employees.total, 0),
      activeEmployees: dashboard.reduce(
        (sum, d) => sum + d.employees.active,
        0
      ),
      totalDepartments: dashboard.reduce(
        (sum, d) => sum + d.departments.total,
        0
      ),
      totalCompanies: companies.length,
      recentPayroll: dashboard.reduce((sum, d) => {
        const latest = d.salaries.recent[0];
        return sum + (latest?.total || 0);
      }, 0),
      pendingLeaves: dashboard.reduce(
        (sum, d) => sum + d.leaves.pending.count,
        0
      ),
    };

    return NextResponse.json(
      {
        dashboard,
        aggregated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching employer dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
