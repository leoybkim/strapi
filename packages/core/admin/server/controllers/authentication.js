'use strict';

const passport = require('koa-passport');
const compose = require('koa-compose');
const { ApplicationError, ValidationError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateMultiFactorAuthenticationInput,
  validateResetPasswordInput,
  validateRenewTokenInput,
} = require('../validation/authentication');

module.exports = {
  login: compose([
    (ctx, next) => {
      return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
          strapi.eventHub.emit('admin.auth.error', { error: err, provider: 'local' });
          // if this is a recognized error, allow it to bubble up to user
          if (err.details?.code === 'LOGIN_NOT_ALLOWED') {
            throw err;
          }

          // for all other errors throw a generic error to prevent leaking info
          return ctx.notImplemented();
        }

        if (!user) {
          strapi.eventHub.emit('admin.auth.error', {
            error: new Error(info.message),
            provider: 'local',
          });
          throw new ApplicationError(info.message);
        }

        ctx.state.user = user;

        const sanitizedUser = getService('user').sanitizeUser(user);

        // TODO LK: Check if the MFA is turned on
        // const advanced = await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' }).get();
        // if (advanced.multi_factor_authentication)

        if (true) {
          // Generate 6 digit code
          const verificationCode = getService('token').createVerificationToken();
          getService('auth').sendMultiFactorAuthenticationEmail({
            user: sanitizedUser,
            code: verificationCode
          });

          // Store the verification code in the user's session for later verification
          ctx.session.verificationCode = verificationCode;
        }

        strapi.eventHub.emit('admin.auth.success', { user: sanitizedUser, provider: 'local' });
        return next();
      })(ctx, next);
    },
    (ctx) => {
      const { user } = ctx.state;

      ctx.body = {
        data: {
          token: getService('token').createJwtToken(user),
          user: getService('user').sanitizeUser(ctx.state.user) // TODO: fetch more detailed info,
        },
      };
    },
  ]),

  async renewToken(ctx) {
    await validateRenewTokenInput(ctx.request.body);

    const { token } = ctx.request.body;

    const { isValid, payload } = getService('token').decodeJwtToken(token);

    if (!isValid) {
      throw new ValidationError('Invalid token');
    }

    ctx.body = {
      data: {
        token: getService('token').createJwtToken({ id: payload.id }),
      },
    };
  },

  async registrationInfo(ctx) {
    await validateRegistrationInfoQuery(ctx.request.query);

    const { registrationToken } = ctx.request.query;

    const registrationInfo = await getService('user').findRegistrationInfo(registrationToken);

    if (!registrationInfo) {
      throw new ValidationError('Invalid registrationToken');
    }

    ctx.body = { data: registrationInfo };
  },

  async register(ctx) {
    const input = ctx.request.body;

    await validateRegistrationInput(input);

    const user = await getService('user').register(input);

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    };
  },

  async registerAdmin(ctx) {
    const input = ctx.request.body;

    await validateAdminRegistrationInput(input);

    const hasAdmin = await getService('user').exists();

    if (hasAdmin) {
      throw new ApplicationError('You cannot register a new super admin');
    }

    const superAdminRole = await getService('role').getSuperAdmin();

    if (!superAdminRole) {
      throw new ApplicationError(
        "Cannot register the first admin because the super admin role doesn't exist."
      );
    }

    const user = await getService('user').create({
      ...input,
      registrationToken: null,
      isActive: true,
      roles: superAdminRole ? [superAdminRole.id] : [],
    });

    strapi.telemetry.send('didCreateFirstAdmin');

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    };
  },

  async forgotPassword(ctx) {
    const input = ctx.request.body;

    await validateForgotPasswordInput(input);

    getService('auth').forgotPassword(input);

    ctx.status = 204;
  },

  async multiFactorAuthentication(ctx) {
    const input = ctx.request.body;

    await validateMultiFactorAuthenticationInput(input);
    if (input.code !== ctx.session.verificationCode) {
      ctx.status = 403; // Throw forbidden error: incorrect verification code
    } else {
      ctx.status = 200;
    }
  },

  async resetPassword(ctx) {
    const input = ctx.request.body;

    await validateResetPasswordInput(input);

    const user = await getService('auth').resetPassword(input);

    ctx.body = {
      data: {
        token: getService('token').createJwtToken(user),
        user: getService('user').sanitizeUser(user),
      },
    };
  },

  logout(ctx) {
    const sanitizedUser = getService('user').sanitizeUser(ctx.state.user);
    strapi.eventHub.emit('admin.logout', { user: sanitizedUser });
    ctx.body = { data: {} };
  },
};
