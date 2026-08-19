const Session = require("supertokens-node/recipe/session");
const User = require("../models/User");

const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // 1. Verify SuperTokens session
            const session = await Session.getSession(req, res);

            // 2. Get authenticated SuperTokens user ID
            const supertokensUserId = session.getUserId();

            // 3. Find corresponding user in MongoDB
            const user = await User.findOne({
                supertokensUserId: supertokensUserId
            });

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            // 4. Check user's role
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    message: "Access denied"
                });
            }

            // 5. Attach user to request
            req.user = user;

            // 6. Continue to controller
            next();

        } catch (error) {
            console.error("Authorization error:", error);

            return res.status(401).json({
                message: "Unauthorized"
            });
        }
    };
};

module.exports = {
    requireRole
};