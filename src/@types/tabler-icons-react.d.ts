declare module '@tabler/icons-react' {
  import type { FC, SVGProps } from 'react';
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number;
    stroke?: number;
    className?: string;
  }
  export const IconHome: FC<IconProps>;
  export const IconSearch: FC<IconProps>;
  export const IconCirclePlus: FC<IconProps>;
  export const IconHeart: FC<IconProps>;
  export const IconUser: FC<IconProps>;
  export const IconLayoutNavbarCollapse: FC<IconProps>;
  export const IconBrandGithub: FC<IconProps>;
  export const IconBrandX: FC<IconProps>;
  export const IconExchange: FC<IconProps>;
  export const IconNewSection: FC<IconProps>;
  export const IconTerminal2: FC<IconProps>;
  export const IconNotification: FC<IconProps>;
}