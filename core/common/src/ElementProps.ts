/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module WireFormats */

import { GuidString, Id64, Id64String, Logger } from "@bentley/bentleyjs-core";
import { AngleProps, LowAndHighXY, LowAndHighXYZ, XYProps, XYZProps, YawPitchRollProps } from "@bentley/geometry-core";
import { CodeProps } from "./Code";
import { CommonLoggerCategory } from "./CommonLoggerCategory";
import { EntityProps } from "./EntityProps";
import { GeometryStreamProps } from "./geometry/GeometryStream";
import { IModelError, IModelStatus } from "./IModelError";
import { Rank, SubCategoryAppearance } from "./SubCategoryAppearance";

/** Properties of a NavigationProperty.
 * @public
 */
export interface RelatedElementProps {
  /** The Id of the element to which this element is related. */
  id: Id64String;
  /** The full className of the relationship class. */
  relClassName?: string;
}

/** Properties of an [Element]($docs/bis/intro/element-fundamentals)
 * @public
 */
export interface ElementProps extends EntityProps {
  /** The Id of the [Model]($docs/bis/intro/model-fundamentals.md) containing this element */
  model: Id64String;
  /** The [Code]($docs/bis/intro/codes.md) for this element */
  code: CodeProps;
  /** The Parent of this element, if defined. */
  parent?: RelatedElementProps;
  /** A [FederationGuid]($docs/bis/intro/element-fundamentals.md#federationguid) assigned to this element by some other federated database */
  federationGuid?: GuidString;
  /** A [user-assigned label]($docs/bis/intro/element-fundamentals.md#userlabel) for this element. */
  userLabel?: string;
  /** Optional [json properties]($docs/bis/intro/element-fundamentals.md#jsonproperties) of this element. */
  jsonProperties?: any;
}

/** The Id and relationship class of an Element that is somehow related to another Element
 * @public
 */
export class RelatedElement implements RelatedElementProps {
  /** The Id of the element to which this element is related. */
  public readonly id: Id64String;
  /** The full className of the relationship class. */
  public readonly relClassName?: string;
  constructor(props: RelatedElementProps) { this.id = Id64.fromJSON(props.id); this.relClassName = props.relClassName; }
  public static fromJSON(json?: RelatedElementProps): RelatedElement | undefined { return json ? new RelatedElement(json) : undefined; }

  /** Accept the value of a navigation property that might be in the shortened format of just an id or might be in the full RelatedElement format. */
  public static idFromJson(json: any): Id64String {
    if ((typeof json === "object") && ("id" in json)) {
      const r = RelatedElement.fromJSON(json);
      if (r === undefined)
        throw new IModelError(IModelStatus.BadArg, "Problem parsing Id64 from json", Logger.logWarning, CommonLoggerCategory.ElementProps);
      return r.id;
    }
    return Id64.fromJSON(json);
  }
}

/** A [RelatedElement]($common) relationship that describes the [TypeDefinitionElement]($backend) of an element.
 * @public
 */
export class TypeDefinition extends RelatedElement {
}

/** Properties of a [GeometricElement]($backend)
 * @public
 */
export interface GeometricElementProps extends ElementProps {
  /** The id of the category for this geometric element. */
  category: Id64String;
  geom?: GeometryStreamProps;
}

/** Properties of a [[Placement3d]]
 * @public
 */
export interface Placement3dProps {
  origin: XYZProps;
  angles: YawPitchRollProps;
  bbox?: LowAndHighXYZ;
}

/** Properties of a [[Placement2d]]
 * @public
 */
export interface Placement2dProps {
  origin: XYProps;
  angle: AngleProps;
  bbox?: LowAndHighXY;
}

/** @public */
export type PlacementProps = Placement2dProps | Placement3dProps;

/** Properties that define a [GeometricElement3d]($backend)
 * @public
 */
export interface GeometricElement3dProps extends GeometricElementProps {
  placement?: Placement3dProps;
  typeDefinition?: RelatedElementProps;
}

/** An enumeration of the different types of sections.
 * @public
 */
export enum SectionType {
  Section = 3,
  Detail = 4,
  Elevation = 5,
  Plan = 6,
}

/** Properties that define a [SectionLocation]($backend)
 * @beta
 */
export interface SectionLocationProps extends GeometricElement3dProps {
  /** Section type */
  sectionType?: SectionType;
  /** Details on how this section was clipped. A ClipVector stored as a json string. */
  clipGeometry?: any;
  /** The element Id of the [ModelSelector]($backend) for this SectionLocation */
  modelSelectorId?: Id64String;
  /** The element Id of the [CategorySelector]($backend) for this SectionLocation */
  categorySelectorId?: Id64String;
}

/** Properties that define a [GeometricElement2d]($backend)
 * @public
 */
export interface GeometricElement2dProps extends GeometricElementProps {
  placement?: Placement2dProps;
  typeDefinition?: RelatedElementProps;
}

/** Properties of a [GeometryPart]($backend)
 * @public
 */
export interface GeometryPartProps extends ElementProps {
  geom?: GeometryStreamProps;
  bbox?: LowAndHighXYZ;
}

/** Properties for a [ViewAttachment]($backend)
 * @public
 */
export interface ViewAttachmentProps extends GeometricElement2dProps {
  view: RelatedElementProps;
}

/** Properties of a [Subject]($backend)
 * @public
 */
export interface SubjectProps extends ElementProps {
  description?: string;
}

/** Properties of a [SheetBorderTemplate]($backend)
 * @beta
 */
export interface SheetBorderTemplateProps extends ElementProps {
  height?: number;
  width?: number;
}

/** Properties of a [SheetTemplate]($backend)
 * @beta
 */
export interface SheetTemplateProps extends ElementProps {
  height?: number;
  width?: number;
  border?: Id64String;
}

/** Properties of a [Sheet]($backend)
 * @beta
 */
export interface SheetProps extends ElementProps {
  width?: number;
  height?: number;
  scale?: number;
  sheetTemplate?: Id64String;
  attachments?: Id64String[];
}

/** Properties of a [DefinitionElement]($backend)
 * @public
 */
export interface DefinitionElementProps extends ElementProps {
  isPrivate?: boolean;
}

/** Properties of a [TypeDefinitionElement]($backend)
 * @public
 */
export interface TypeDefinitionElementProps extends DefinitionElementProps {
  recipe?: RelatedElementProps;
}

/** Properties of a [InformationPartitionElement]($backend)
 * @public
 */
export interface InformationPartitionElementProps extends DefinitionElementProps {
  description?: string;
}

/** Parameters to specify what element to load for [IModelDb.Elements.getElementProps]($backend).
 * @public
 */
export interface ElementLoadProps {
  id?: Id64String;
  code?: CodeProps;
  federationGuid?: GuidString;
  /** Whether to include geometry stream in GeometricElementProps and GeometryPartProps, false when undefined */
  wantGeometry?: boolean;
  /** When including a geometry stream containing brep entries, whether to return the raw brep data or proxy geometry, false when undefined */
  wantBRepData?: boolean;
}

/** Properties of an [ElementAspect]($backend)
 * @public
 */
export interface ElementAspectProps extends EntityProps {
  element: RelatedElementProps;
}

/** Properties of an [ExternalSourceAspect]($backend) that stores synchronization information for an element originating from an external source.
 * @public
 */
export interface ExternalSourceAspectProps extends ElementAspectProps {
  /** An element that scopes the combination of `kind` and `identifier` to uniquely identify the object from the external source. */
  scope: RelatedElementProps;
  /** The identifier of the object in the source repository. */
  identifier: string;
  /** The kind of object within the source repository. */
  kind: string;
  /** An optional value that is typically a version number or a pseudo version number like last modified time.
   * It will be used by the synchronization process to detect that a source object is unchanged so that computing a cryptographic hash can be avoided.
   * If present, this value must be guaranteed to change when any of the source object's content changes.
   */
  version?: string;
  /** The optional cryptographic hash (any algorithm) of the source object's content. If defined, it must be guaranteed to change when the source object's content changes. */
  checksum?: string;
  /** A place where additional JSON properties can be stored. For example, provenance information or properties relating to the synchronization process. */
  jsonProperties?: any;
}

/** Properties of a [LineStyle]($backend)
 * @beta
 */
export interface LineStyleProps extends ElementProps {
  description?: string;
  data: string;
}

/** Properties of a [LightLocation]($backend)
 * @internal
 */
export interface LightLocationProps extends GeometricElement3dProps {
  enabled?: boolean;
}

/** Parameters of a [Category]($backend)
 * @public
 */
export interface CategoryProps extends ElementProps {
  rank?: Rank;
  description?: string;
}

/** Parameters of a [SubCategory]($backend)
 * @public
 */
export interface SubCategoryProps extends ElementProps {
  appearance?: SubCategoryAppearance.Props;
  description?: string;
}
