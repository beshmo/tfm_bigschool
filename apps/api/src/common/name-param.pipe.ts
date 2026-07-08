import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { RESOURCE_NAME_PATTERN } from '@okvns/shared';

/** Validates and normalizes a resource name supplied as a route parameter. */
@Injectable()
export class NameParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!RESOURCE_NAME_PATTERN.test(trimmed)) {
      throw new BadRequestException('Route parameter must be a valid resource name.');
    }
    return trimmed;
  }
}
