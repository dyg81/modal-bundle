<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Tests\Fixtures;

use Dyg81\ModalBundle\Dyg81ModalBundle;
use Symfony\Bundle\FrameworkBundle\FrameworkBundle;
use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Bundle\TwigBundle\TwigBundle;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

final class TestKernel extends Kernel
{
    use MicroKernelTrait;

    /**
     * @param array<string, mixed> $bundleConfig
     */
    public function __construct(string $environment, bool $debug, private readonly array $bundleConfig = [])
    {
        parent::__construct($environment, $debug);
    }

    public function registerBundles(): iterable
    {
        yield new FrameworkBundle();
        yield new TwigBundle();
        yield new Dyg81ModalBundle();
    }

    protected function configureContainer(ContainerConfigurator $container): void
    {
        $container->extension('framework', [
            'secret' => 'test',
            'test' => true,
            'http_method_override' => false,
            'handle_all_throwables' => true,
            'php_errors' => ['log' => true],
            'default_locale' => 'en',
            'translator' => ['fallbacks' => ['en']],
        ]);
        $container->extension('dyg81_modal', $this->bundleConfig);
    }

    protected function configureRoutes(RoutingConfigurator $routes): void
    {
        $routes->import('@Dyg81ModalBundle/config/routes.php')->prefix('/modal');
    }

    public function getProjectDir(): string
    {
        return __DIR__;
    }

    public function getCacheDir(): string
    {
        return sys_get_temp_dir().'/dyg81_modal_bundle/'.md5(serialize($this->bundleConfig)).'/cache';
    }

    public function getLogDir(): string
    {
        return sys_get_temp_dir().'/dyg81_modal_bundle/log';
    }
}
