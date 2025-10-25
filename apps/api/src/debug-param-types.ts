import 'reflect-metadata';

export function logParamTypes(target: Function) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const types = Reflect.getMetadata('design:paramtypes', target) || [];
  console.log(
    `🔍 ${target.name} paramtypes =>`,
    types.map((t: any) => (t ? t.name ?? typeof t : t))
  );
}
