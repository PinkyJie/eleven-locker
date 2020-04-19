import { Resolver, Args, Query, Mutation, CONTEXT } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';

import { GqlContext } from '../gql.context';

import { SessionUser } from './auth.model';
import { AuthService } from './auth.service';
import { PublicAccess } from './auth.decorator';

@Resolver()
export class AuthResolver {
  constructor(
    @Inject(CONTEXT) private readonly ctx: GqlContext,
    private authService: AuthService
  ) {}

  @Query(() => SessionUser, {
    name: 'sessionUser',
    description: 'Retrieve current logged in session user.',
    nullable: true,
  })
  /**
   * Put a variable for the query so it's easier for front end to
   * trigger query once the token is changed.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSessionUser(@Args('token') token: string): SessionUser {
    if ('user' in this.ctx.req) {
      return this.ctx.req['user'];
    }
    return null;
  }

  @PublicAccess()
  @Mutation(() => SessionUser, {
    description: 'Sign up for new user.',
  })
  async signup(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('invitationCode') invitationCode: string
  ): Promise<SessionUser> {
    return this.authService.signup(email, password, invitationCode);
  }
}
