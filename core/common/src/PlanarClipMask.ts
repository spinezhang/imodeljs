/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module DisplayStyles
 */

import { compareStringsOrUndefined, CompressedId64Set, Id64Set, Id64String } from "@bentley/bentleyjs-core";
import { SSL_OP_NETSCAPE_DEMO_CIPHER_CHANGE_BUG } from "constants";

export enum PlanarClipMaskMode {
  None = 0,
  HigherPriorityModels = 1,
  Models,
  SubCategories,
  Elements,
};

export class PlanarClipMask {
  public readonly mode: PlanarClipMaskMode = PlanarClipMaskMode.None;
  public readonly modelIds?: CompressedId64Set;
  public readonly subCategoryOrElementIds?: CompressedId64Set;

  /** Create a new SubCategoryOverride from a JSON object */
  public static fromJSON(json?: PlanarClipMaskProps): PlanarClipMask {
    if (!json)
      return this.defaults;

    return new PlanarClipMask(json.mode, json.modelIds, json.subCategoryOrElementIds);
  }

  public static create(mode: PlanarClipMaskMode, modelIds?: Id64Set, subCategoryOrElementIds?: Id64Set): PlanarClipMask | undefined {
    switch (mode) {
      case PlanarClipMaskMode.None:
      case PlanarClipMaskMode.HigherPriorityModels:
        return new PlanarClipMask(mode);

      case PlanarClipMaskMode.Models:
        return modelIds === undefined ? undefined : new PlanarClipMask(mode, CompressedId64Set.compressSet(modelIds));

      case PlanarClipMaskMode.SubCategories:
      case PlanarClipMaskMode.Elements:
        return subCategoryOrElementIds === undefined ? undefined : new PlanarClipMask(mode, modelIds ? CompressedId64Set.compressSet(modelIds) : undefined, CompressedId64Set.compressSet(subCategoryOrElementIds));

      default:
        return undefined;
    }
  }

  public toJSON(): PlanarClipMaskProps {
    return { mode: this.mode, modelIds: this.modelIds, subCategoryOrElementIds: this.subCategoryOrElementIds };
  }

  public get anyDefined(): boolean { return this.mode !== PlanarClipMaskMode.None; }

  public equals(other: PlanarClipMask): boolean {
    return this.mode === other.mode &&
      compareStringsOrUndefined(this.modelIds, other.modelIds) === 0 &&
      compareStringsOrUndefined(this.subCategoryOrElementIds, other.subCategoryOrElementIds) === 0;
  }

  private constructor(mode: PlanarClipMaskMode, modelIds?: CompressedId64Set, subCategoryOrElementIds?: CompressedId64Set) {
    this.mode = mode;
    this.modelIds = modelIds;
    this.subCategoryOrElementIds = subCategoryOrElementIds;
  }
  /** A default PlanarClipMask which masks nothing. */
  public static defaults = new PlanarClipMask(PlanarClipMaskMode.None);
}

export interface PlanarClipMaskProps {
  mode: PlanarClipMaskMode;
  modelIds?: CompressedId64Set;
  subCategoryOrElementIds?: CompressedId64Set;
}
