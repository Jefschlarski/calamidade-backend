import request from 'supertest';
import {
  APP_URL,
  TESTER_EMAIL,
  TESTER_PASSWORD,
  MAIL_HOST,
  MAIL_PORT,
} from '../utils/constants';

describe('Auth user (e2e)', () => {
  const app = APP_URL;
  const mail = `http://${MAIL_HOST}:${MAIL_PORT}`;
  const newUserFirstName = `Tester${Date.now()}`;
  const newUserLastName = `E2E`;
  const newUserEmail = `User.${Date.now()}@example.com`;
  const newUserPassword = `secret`;

  it('Login: /${process.env.API_PREFIX}/v1/auth/email/login (POST)', () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: TESTER_EMAIL, password: TESTER_PASSWORD })
      .expect(200)
      .expect(({ body }) => {
        expect(body.token).toBeDefined();
        expect(body.refreshToken).toBeDefined();
        expect(body.tokenExpires).toBeDefined();
        expect(body.user.email).toBeDefined();
        expect(body.user.hash).not.toBeDefined();
        expect(body.user.password).not.toBeDefined();
        expect(body.user.previousPassword).not.toBeDefined();
      });
  });

  it(`Login via admin endpoint: /${process.env.API_PREFIX}/v1/auth/admin/email/login (POST)`, () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/admin/email/login`)
      .send({ email: TESTER_EMAIL, password: TESTER_PASSWORD })
      .expect(422);
  });

  it(`Login via admin endpoint with extra spaced: /${process.env.API_PREFIX}/v1/auth/admin/email/login (POST)`, () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/admin/email/login`)
      .send({ email: TESTER_EMAIL + '  ', password: TESTER_PASSWORD })
      .expect(422);
  });

  it(`Do not allow register user with exists email: /${process.env.API_PREFIX}/v1/auth/email/register (POST)`, () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/register`)
      .send({
        email: TESTER_EMAIL,
        password: TESTER_PASSWORD,
        firstName: 'Tester',
        lastName: 'E2E',
      })
      .expect(422)
      .expect(({ body }) => {
        expect(body.erros.email).toBe('emailAlreadyExists');
      });
  });

  it(`Register new user: /${process.env.API_PREFIX}/v1/auth/email/register (POST)`, async () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/register`)
      .send({
        email: newUserEmail,
        password: newUserPassword,
        firstName: newUserFirstName,
        lastName: newUserLastName,
      })
      .expect(204);
  });

  it(`Login unconfirmed user: /${process.env.API_PREFIX}/v1/auth/email/login (POST)`, () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .expect(200)
      .expect(({ body }) => {
        expect(body.token).toBeDefined();
      });
  });

  it.skip(`Confirm email: /${process.env.API_PREFIX}/v1/auth/email/confirm (POST)`, async () => {
    const hash = await request(mail)
      .get('/email')
      .then(({ body }) =>
        body
          .find(
            (letter) =>
              letter.to[0].address.toLowerCase() ===
                newUserEmail.toLowerCase() &&
              /.*confirm\-email\/(\w+).*/g.test(letter.text),
          )
          ?.text.replace(/.*confirm\-email\/(\w+).*/g, '$1'),
      );

    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/confirm`)
      .send({
        hash,
      })
      .expect(204);
  });

  it.skip(`Can not confirm email with same link twice: /${process.env.API_PREFIX}/v1/auth/email/confirm (POST)`, async () => {
    const hash = await request(mail)
      .get('/email')
      .then(({ body }) =>
        body
          .find(
            (letter) =>
              letter.to[0].address.toLowerCase() ===
                newUserEmail.toLowerCase() &&
              /.*confirm\-email\/(\w+).*/g.test(letter.text),
          )
          ?.text.replace(/.*confirm\-email\/(\w+).*/g, '$1'),
      );

    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/confirm`)
      .send({
        hash,
      })
      .expect(404);
  });

  it(`Login confirmed user: /${process.env.API_PREFIX}/v1/auth/email/login (POST)`, () => {
    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .expect(200)
      .expect(({ body }) => {
        expect(body.token).toBeDefined();
        expect(body.user.email).toBeDefined();
      });
  });

  it(`Confirmed user retrieve profile: /${process.env.API_PREFIX}/v1/auth/me (GET)`, async () => {
    const newUserApiToken = await request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .then(({ body }) => body.token);

    await request(app)
      .get(`/${process.env.API_PREFIX}/v1/auth/me`)
      .auth(newUserApiToken, {
        type: 'bearer',
      })
      .send()
      .expect(({ body }) => {
        expect(body.provider).toBeDefined();
        expect(body.email).toBeDefined();
        expect(body.hash).not.toBeDefined();
        expect(body.password).not.toBeDefined();
        expect(body.previousPassword).not.toBeDefined();
      });
  });

  it(`Refresh token: /${process.env.API_PREFIX}/v1/auth/refresh (GET)`, async () => {
    const newUserRefreshToken = await request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .then(({ body }) => body.refreshToken);

    await request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/refresh`)
      .auth(newUserRefreshToken, {
        type: 'bearer',
      })
      .send()
      .expect(200)
      .expect(({ body }) => {
        expect(body.token).toBeDefined();
        expect(body.refreshToken).toBeDefined();
        expect(body.tokenExpires).toBeDefined();
      });
  });

  it(`New user update profile: /${process.env.API_PREFIX}/v1/auth/me (PATCH)`, async () => {
    const newUserNewName = Date.now();
    const newUserNewPassword = 'new-secret';
    const newUserApiToken = await request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .then(({ body }) => body.token);

    await request(app)
      .patch(`/${process.env.API_PREFIX}/v1/auth/me`)
      .auth(newUserApiToken, {
        type: 'bearer',
      })
      .send({
        firstName: newUserNewName,
        password: newUserNewPassword,
      })
      .expect(422);

    await request(app)
      .patch(`/${process.env.API_PREFIX}/v1/auth/me`)
      .auth(newUserApiToken, {
        type: 'bearer',
      })
      .send({
        firstName: newUserNewName,
        password: newUserNewPassword,
        oldPassword: newUserPassword,
      })
      .expect(200);

    await request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserNewPassword })
      .expect(200)
      .expect(({ body }) => {
        expect(body.token).toBeDefined();
      });

    await request(app)
      .patch(`/${process.env.API_PREFIX}/v1/auth/me`)
      .auth(newUserApiToken, {
        type: 'bearer',
      })
      .send({ password: newUserPassword, oldPassword: newUserNewPassword })
      .expect(200);
  });

  it(`New user delete profile: /${process.env.API_PREFIX}/v1/auth/me (DELETE)`, async () => {
    const newUserApiToken = await request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .then(({ body }) => body.token);

    await request(app).delete(`/${process.env.API_PREFIX}/v1/auth/me`).auth(newUserApiToken, {
      type: 'bearer',
    });

    return request(app)
      .post(`/${process.env.API_PREFIX}/v1/auth/email/login`)
      .send({ email: newUserEmail, password: newUserPassword })
      .expect(422);
  });
});
