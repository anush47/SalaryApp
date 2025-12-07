import dbConnect from "@/app/lib/db";
import User from "@/app/models/User";
import Company from "@/app/models/Company";
import bcrypt from "bcrypt";
import { isGoogleOAuthUser } from "@/app/lib/authHelpers";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";
import { userCreateSchema, userUpdateSchema } from "@/app/lib/schemas";
import { NextRequest } from "next/server";

export class UserService {
    static async getUsers(req: NextRequest, context: any) {
        const { user: currentUser } = context;
        const userId = currentUser?.id;

        // check if need Companies is in the query
        const needCompanies =
            req.nextUrl.searchParams.get("needCompanies") === "true";

        // check if me=true is in the query
        const me = req.nextUrl.searchParams.get("me");

        if (me === "true") {
            await dbConnect();
            const _user = await User.findById(userId);
            if (!_user) {
                throw new Error("User not found");
            }
            const userToReturn = _user.toObject();
            delete userToReturn.password;
            return { users: [userToReturn] };
        }

        // check if userId is in the query
        const _userId = req.nextUrl.searchParams.get("userId");

        // only allow admins
        if (currentUser?.role !== "admin" && _userId !== userId) {
            throw new Error("Unauthorized");
        }

        await dbConnect();

        if (_userId) {
            const _user = await User.findById(_userId);
            if (!_user) {
                throw new Error("User not found");
            }
            if (isGoogleOAuthUser(_user.password)) {
                _user.name += " (google)";
            }

            delete _user.password;
            if (needCompanies && _user.role !== "admin") {
                const companies = await Company.find({ user: _user._id })
                    .select("name")
                    .lean();
                _user.companies = companies;
            }
            return { users: [_user] };
        } else {
            const { page, limit, skip } = getPaginationParams(req);

            const users = await User.find()
                .skip(skip)
                .limit(limit)
                .select("-password")
                .lean();

            const total = await getTotalCount(User, {});

            if (needCompanies && users.length > 0) {
                const userIds = users
                    .filter((u: any) => u.role !== "admin")
                    .map((u: any) => u._id);

                if (userIds.length > 0) {
                    const companies = await Company.find({ user: { $in: userIds } })
                        .select("name user")
                        .lean();

                    const companiesByUser = companies.reduce((acc: any, company: any) => {
                        const userId = company.user.toString();
                        if (!acc[userId]) acc[userId] = [];
                        acc[userId].push(company);
                        return acc;
                    }, {});

                    users.forEach((user: any) => {
                        if (user.role !== "admin") {
                            user.companies = companiesByUser[user._id.toString()] || [];
                        }
                    });
                }
            }

            return createPaginatedResponse(users, page, limit, total);
        }
    }

    static async createUser(body: any, context: any) {
        const { user: currentUser } = context;

        if (currentUser?.role !== "admin") {
            throw new Error("Unauthorized");
        }

        const { name, email, password } = userCreateSchema.parse(body);

        const _user = new User({
            name,
            email,
            password,
        });

        const hashedNewPassword = bcrypt.hashSync(password, 10);
        _user.password = hashedNewPassword;

        await dbConnect();
        const result = await User.create(_user);

        return {
            message: "User created",
            user: {
                _id: result._id,
                email: result.email,
                role: result.role,
                name: result.name,
            },
        };
    }

    static async updateUser(body: any, context: any) {
        const { user: currentUser } = context;

        if (!currentUser) {
            throw new Error("Unauthorized");
        }

        const updatedData = userUpdateSchema.parse(body);

        await dbConnect();
        const _user = await User.findOneAndUpdate(
            { _id: currentUser.id },
            updatedData,
            { new: true }
        );

        if (!_user) {
            throw new Error("User not found");
        }

        const userToReturn = _user.toObject();
        delete userToReturn.password;

        return { user: userToReturn };
    }

    static async deleteUser(req: NextRequest, context: any) {
        const { user: currentUser } = context;

        if (currentUser?.role !== "admin") {
            throw new Error("Unauthorized");
        }

        const _userId = req.nextUrl.searchParams.get("userId");
        if (!_userId) {
            throw new Error("User ID is required");
        }

        await dbConnect();

        const companyCount = await Company.countDocuments({ user: _userId });

        if (companyCount > 0) {
            throw new Error("User has companies associated with them");
        }

        const _user = await User.findById(_userId).select("_id role");

        if (_user?.role === "admin" || _user?.role === "employer") {
            throw new Error("Cannot delete an admin or employer user");
        }

        await User.deleteOne({ _id: _userId });

        return { message: "User deleted" };
    }
}
