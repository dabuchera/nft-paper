export type PrivateMetadataFile = {
  files: IPrivateFile[];
};

export type IPrivateFile = {
  path: string;
  isPublic: boolean;
  isString: boolean;
  lastModified: string;
  url: string;
};

export type PublicMetadataFile = {
  files: IPublicFile[];
};

export type IPublicFile = {
  userAddress: string,
  path: string;
  isPublic: boolean;
  isString: boolean;
  lastModified: string;
  url: string;
};