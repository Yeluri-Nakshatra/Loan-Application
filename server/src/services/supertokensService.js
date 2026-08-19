const supertokens = require("supertokens-node");
const EmailPassword = require("supertokens-node/recipe/emailpassword");

/**
 * Find SuperTokens User By Email (Fast direct lookup)
 */
const getSuperTokensUserByEmail = async (email) => {
  try {
    if (!email) return null;
    const users = await supertokens.listUsersByAccountInfo("public", { email: email.toLowerCase().trim() });
    if (users && users.length > 0) {
      const user = users[0];
      return {
        userId: user.id || user.userId,
        email: email.toLowerCase().trim(),
      };
    }
    return null;
  } catch (error) {
    console.warn("SuperTokens user direct lookup warning:", error.message);
    return null;
  }
};

/**
 * Delete SuperTokens User
 */
const deleteSuperTokensUser = async (userId) => {
  try {
    if (!userId) {
      return { success: false, reason: "USER_ID_MISSING" };
    }
    const result = await supertokens.deleteUser(userId, true);
    return { success: true };
  } catch (error) {
    console.warn("SuperTokens user deletion warning:", error.message);
    return { success: false, reason: "DELETE_FAILED", error };
  }
};

/**
 * Create SuperTokens User with auto-recovery for duplicate emails
 */
const createSuperTokensUser = async (email, password) => {
  try {
    const cleanEmail = email.toLowerCase().trim();
    let result = await EmailPassword.signUp("public", cleanEmail, password);

    if (result.status === "EMAIL_ALREADY_EXISTS") {
      // Find existing user and delete so the fresh password takes effect
      const existing = await getSuperTokensUserByEmail(cleanEmail);
      if (existing && existing.userId) {
        await deleteSuperTokensUser(existing.userId);
        result = await EmailPassword.signUp("public", cleanEmail, password);
      }
    }

    if (result.status === "OK") {
      return {
        success: true,
        userId: result.recipeUserId ? result.recipeUserId.getAsString() : result.user.id,
      };
    }

    return {
      success: false,
      reason: result.status,
    };
  } catch (error) {
    console.error("SuperTokens user creation error:", error);
    return {
      success: false,
      reason: "CREATION_FAILED",
      error: error.message,
    };
  }
};

module.exports = {
  createSuperTokensUser,
  getSuperTokensUserByEmail,
  deleteSuperTokensUser,
};