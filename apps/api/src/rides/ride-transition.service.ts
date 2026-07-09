import { Injectable } from "@nestjs/common";
import {
  assertRideStateTransition,
  type RideStateTransitionInput,
} from "@tami/shared";

@Injectable()
export class RideTransitionService {
  recordTransition(input: RideStateTransitionInput): RideStateTransitionInput {
    return assertRideStateTransition(input);
  }
}
