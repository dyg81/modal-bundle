<?php

namespace Dyg81\ModalBundle\Tests\Fixtures\app;

use Dyg81\ModalBundle\Dyg81ModalBundle;
use Symfony\Bundle\FrameworkBundle\FrameworkBundle;
use Symfony\Bundle\TwigBundle\TwigBundle;
use Symfony\Component\Config\Loader\LoaderInterface;
use Symfony\Component\HttpKernel\Kernel;

class AppKernel extends Kernel
{
    public function registerBundles(): iterable
    {
        return [
            new FrameworkBundle(),
            new TwigBundle(),
            new Dyg81ModalBundle(),
        ];
    }

    public function registerContainerConfiguration(LoaderInterface $loader)
    {
        $loader->load(__DIR__.'/config/config.yml');
    }

    public function getProjectDir(): string
    {
        return __DIR__;
    }

    public function getCacheDir(): string
    {
        return sys_get_temp_dir().'/modal-bundle/cache/'.md5(__DIR__.\get_class($this).$this->environment);
    }

    public function getLogDir(): string
    {
        return sys_get_temp_dir().'/modal-bundle/log';
    }
}
