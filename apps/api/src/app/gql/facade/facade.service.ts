import { Injectable, Logger } from '@nestjs/common';
import faker from 'faker';

import { EmailService } from '../email/email.service';
import { AccountService } from '../seven-eleven/account/account.service';
import { FuelService } from '../seven-eleven/fuel/fuel.service';
import { VoucherService } from '../seven-eleven/voucher/voucher.service';
import { FuelPrice, FuelType } from '../seven-eleven/fuel/fuel.model';

import { AccountAndVoucher } from './facade.model';

const logger = new Logger('FacadeService');

function multipleAttempts<T>(
  promise: Promise<T>,
  config: {
    isResolveValueValid: (result: T) => boolean;
    attempt: number;
    interval: number;
  }
): Promise<T> {
  const { isResolveValueValid, attempt, interval } = config;
  logger.log(`Current attempt: ${attempt}`);
  return new Promise(resolve => {
    promise.then(result => {
      logger.log(`Result: ${result}`);
      if (isResolveValueValid(result)) {
        resolve(result);
      } else {
        const attemptsLeft = attempt - 1;
        if (attemptsLeft === 0) {
          resolve();
        } else {
          setTimeout(() => {
            multipleAttempts<T>(promise, {
              isResolveValueValid,
              interval,
              attempt: attemptsLeft,
            }).then(resolve);
          }, interval);
        }
      }
    });
  });
}

function getPhoneNumber() {
  const phoneNumber = faker.phone.phoneNumberFormat();
  const phoneArr = phoneNumber.replace(/ /g, '').split('');
  phoneArr.splice(1, 1, '4');
  return phoneArr.join('');
}

@Injectable()
export class FacadeService {
  constructor(
    private emailService: EmailService,
    private accountService: AccountService,
    private fuelService: FuelService,
    private voucherService: VoucherService
  ) {}

  async genAccountAndLockInVoucher(
    fuelType: FuelType
  ): Promise<AccountAndVoucher> {
    const availableEmail = ['@1secmail.net', '1secmail.com', '1secmail.org'];
    const randomIdx = Math.floor(Math.random() * 3);

    faker.locale = 'en_AU';
    const email = `${faker.internet.userName()}${availableEmail[randomIdx]}`;
    const password = faker.internet.password();
    // 1. register a new account
    logger.log('1. Account registration');
    const registerResponse = await this.accountService.register(
      email,
      password,
      faker.name.firstName(),
      faker.name.lastName(),
      getPhoneNumber(),
      Math.floor(
        faker.date
          .between(new Date(1980, 1, 1), new Date(1995, 1, 1))
          .getTime() / 1000
      ).toString()
    );
    if (registerResponse === false) {
      throw new Error('Registration fail');
    }
    logger.log(`Email: ${email}`);
    logger.log(`Password: ${password}`);

    // 2. get best fuel price
    logger.log('2. Get fuel price');
    const fuelPriceResponse = await this.fuelService.getFuelPrices();
    const { price, lat, lng } = fuelPriceResponse[fuelType] as FuelPrice;
    logger.log(`Fuel type: ${fuelType}`);
    logger.log(`Price: ${price}`);
    logger.log(`Latitude: ${lat}`);
    logger.log(`Longitude: ${lng}`);

    // 3. get verification code from email
    // wait email to be arrived
    logger.log('3. Get verification code');
    const maxAttempts = 10;
    logger.log(`Max attempts: ${maxAttempts}`);
    const verificationCode = await multipleAttempts<string>(
      this.emailService.findVerificationCodeInEmail(email),
      {
        isResolveValueValid: result => !!result,
        attempt: maxAttempts,
        interval: 2000,
      }
    );

    if (!verificationCode) {
      throw new Error('Get verification code fail');
    }

    // 4. verify account
    logger.log('4. Verify account');
    const verifyResponse = await this.accountService.verify(verificationCode);
    logger.log(`Account id: ${verifyResponse.id}`);

    // 5. lock in the price
    logger.log('5. Lock in voucher');
    const lockInResponse = await this.voucherService.lockInVoucher(
      verifyResponse.id,
      fuelType,
      150,
      lat,
      lng,
      verifyResponse.deviceSecretToken,
      verifyResponse.accessToken
    );
    if (!lockInResponse) {
      throw new Error('Lock in fail');
    }

    logger.log(`Voucher code: ${lockInResponse.code}`);

    return {
      account: {
        email,
        password,
      },
      voucher: lockInResponse,
    };
  }
}
