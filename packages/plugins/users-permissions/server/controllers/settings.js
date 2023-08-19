'use strict';

const _ = require('lodash');
const { ValidationError } = require('@strapi/utils').errors;
const base32 = require('thirty-two');
const { getService } = require('../utils');
const { isValidEmailTemplate } = require('./validation/email-template');

module.exports = {
  async getEmailTemplate(ctx) {
    ctx.send(await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'email' }).get());
  },

  async updateEmailTemplate(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    const emailTemplates = ctx.request.body['email-templates'];

    for (const key of Object.keys(emailTemplates)) {
      const template = emailTemplates[key].options.message;

      if (!isValidEmailTemplate(template)) {
        throw new ValidationError('Invalid template');
      }
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'email' })
      .set({ value: emailTemplates });

    ctx.send({ ok: true });
  },

  async getAdvancedSettings(ctx) {
    const settings = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const roles = await getService('role').find();

    ctx.send({ settings, roles });
  },

  async getQRCode(ctx) {
    // new two-factor setup.  generate and save a secret key
    const key = this.randomKey(10);
    const encodedKey = base32.encode(key);
    // generate QR code for scanning into Google Authenticator
    // reference: https://code.google.com/p/google-authenticator/wiki/KeyUriFormat
    const otpUrl = `otpauth://totp/${ctx.state.user.email}?secret=${encodedKey}&period=30`;
    const qrCode = `https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=${  encodeURIComponent(otpUrl)}`;
    ctx.send({ qrCode });
  },

  async updateAdvancedSettings(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .set({ value: ctx.request.body });

    ctx.send({ ok: true });
  },

  async getProviders(ctx) {
    const providers = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    for (const provider in providers) {
      if (provider !== 'email') {
        providers[provider].redirectUri = strapi
          .plugin('users-permissions')
          .service('providers')
          .buildRedirectUri(provider);
      }
    }

    ctx.send(providers);
  },

  async updateProviders(ctx) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .set({ value: ctx.request.body.providers });

    ctx.send({ ok: true });
  },
  randomKey (len) {
    const buf = [];
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charlen = chars.length;

    for (let i = 0; i < len; i+=1) {
      buf.push(chars[this.getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
  },
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};
