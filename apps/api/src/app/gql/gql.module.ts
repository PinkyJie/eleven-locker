import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { environment } from '../../environments/environment';
import { getDeviceId } from '../utils/device-id';

import { SevenElevenModule } from './seven-eleven/seven-eleven.module';
import { EmailModule } from './email/email.module';
import { FacadeModule } from './facade/facade.module';
import { GqlContext } from './gql.context';

@Module({
  imports: [
    EmailModule,
    SevenElevenModule,
    FacadeModule,
    GraphQLModule.forRoot({
      context: (): GqlContext => ({
        // get a new device id for every request, otherwise lock in API will return error
        deviceId: getDeviceId(),
      }),
      playground: true,
      ...(environment.readonlyFileSystem
        ? {
            // for read only file system, use in memory file
            autoSchemaFile: true,
          }
        : { autoSchemaFile: 'schema.gql' }),
    }),
  ],
})
export class GqlModule {}
