import protobuf from 'protobufjs';

// Define SVGA 2.0 Protobuf Root definition
const svgaProtoDescriptor: any = {
  nested: {
    com: {
      nested: {
        opensource: {
          nested: {
            svga: {
              nested: {
                MovieParams: {
                  fields: {
                    viewBoxWidth: { type: 'float', id: 1 },
                    viewBoxHeight: { type: 'float', id: 2 },
                    fps: { type: 'int32', id: 3 },
                    frames: { type: 'int32', id: 4 },
                  },
                },
                Transform: {
                  fields: {
                    a: { type: 'float', id: 1 },
                    b: { type: 'float', id: 2 },
                    c: { type: 'float', id: 3 },
                    d: { type: 'float', id: 4 },
                    tx: { type: 'float', id: 5 },
                    ty: { type: 'float', id: 6 },
                  },
                },
                Layout: {
                  fields: {
                    x: { type: 'float', id: 1 },
                    y: { type: 'float', id: 2 },
                    width: { type: 'float', id: 3 },
                    height: { type: 'float', id: 4 },
                  },
                },
                ShapeStyles: {
                  nested: {
                    RGBAColor: {
                      fields: {
                        r: { type: 'float', id: 1 },
                        g: { type: 'float', id: 2 },
                        b: { type: 'float', id: 3 },
                        a: { type: 'float', id: 4 },
                      },
                    },
                  },
                  fields: {
                    fill: { type: 'RGBAColor', id: 1 },
                    stroke: { type: 'RGBAColor', id: 2 },
                    strokeWidth: { type: 'float', id: 3 },
                    lineCap: { type: 'string', id: 4 },
                    lineJoin: { type: 'string', id: 5 },
                    miterLimit: { type: 'float', id: 6 },
                    lineDashI: { type: 'float', id: 7 },
                    lineDashII: { type: 'float', id: 8 },
                    lineDashIII: { type: 'float', id: 9 },
                  },
                },
                ShapeEntity: {
                  fields: {
                    type: { type: 'int32', id: 1 },
                    shape: { type: 'ShapeArgs', id: 2 },
                    rect: { type: 'RectArgs', id: 3 },
                    ellipse: { type: 'EllipseArgs', id: 4 },
                    styles: { type: 'ShapeStyles', id: 5 },
                    transform: { type: 'Transform', id: 6 },
                  },
                },
                ShapeArgs: {
                  fields: {
                    d: { type: 'string', id: 1 },
                  },
                },
                RectArgs: {
                  fields: {
                    x: { type: 'float', id: 1 },
                    y: { type: 'float', id: 2 },
                    width: { type: 'float', id: 3 },
                    height: { type: 'float', id: 4 },
                    cornerRadius: { type: 'float', id: 5 },
                  },
                },
                EllipseArgs: {
                  fields: {
                    x: { type: 'float', id: 1 },
                    y: { type: 'float', id: 2 },
                    radiusX: { type: 'float', id: 3 },
                    radiusY: { type: 'float', id: 4 },
                  },
                },
                FrameEntity: {
                  fields: {
                    alpha: { type: 'float', id: 1 },
                    transform: { type: 'Transform', id: 2 },
                    nx: { type: 'float', id: 3 },
                    ny: { type: 'float', id: 4 },
                    layout: { type: 'Layout', id: 5 },
                    shapes: { rule: 'repeated', type: 'ShapeEntity', id: 6 },
                    clipPath: { type: 'string', id: 7 },
                  },
                },
                SpriteEntity: {
                  fields: {
                    imageKey: { type: 'string', id: 1 },
                    frames: { rule: 'repeated', type: 'FrameEntity', id: 2 },
                    matteKey: { type: 'string', id: 3 },
                  },
                },
                AudioEntity: {
                  fields: {
                    audioKey: { type: 'string', id: 1 },
                    startFrame: { type: 'int32', id: 2 },
                    endFrame: { type: 'int32', id: 3 },
                    startTime: { type: 'int32', id: 4 },
                    totalTime: { type: 'int32', id: 5 },
                  },
                },
                MovieEntity: {
                  fields: {
                    version: { type: 'string', id: 1 },
                    params: { type: 'MovieParams', id: 2 },
                    images: { keyType: 'string', type: 'bytes', id: 3 },
                    sprites: { rule: 'repeated', type: 'SpriteEntity', id: 4 },
                    audios: { rule: 'repeated', type: 'AudioEntity', id: 5 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const svgaRoot = protobuf.Root.fromJSON(svgaProtoDescriptor);

export const MovieEntityType = svgaRoot.lookupType('com.opensource.svga.MovieEntity');

export interface SvgaMovieParams {
  viewBoxWidth: number;
  viewBoxHeight: number;
  fps: number;
  frames: number;
}

export interface SvgaTransform {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  tx?: number;
  ty?: number;
}

export interface SvgaLayout {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SvgaFrameEntity {
  alpha?: number;
  transform?: SvgaTransform;
  nx?: number;
  ny?: number;
  layout?: SvgaLayout;
  shapes?: any[];
  clipPath?: string;
}

export interface SvgaSpriteEntity {
  imageKey?: string;
  frames?: SvgaFrameEntity[];
  matteKey?: string;
}

export interface SvgaAudioEntity {
  audioKey: string;
  startFrame: number;
  endFrame: number;
  startTime: number;
  totalTime: number;
}

export interface SvgaMovieEntity {
  version: string;
  params: SvgaMovieParams;
  images: { [key: string]: Uint8Array };
  sprites: SvgaSpriteEntity[];
  audios?: SvgaAudioEntity[];
}
