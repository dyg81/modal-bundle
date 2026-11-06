<?php

namespace Dyg81\ModalBundle\Tests\Functional;

use Dyg81\ModalBundle\Tests\Fixtures\app\AppKernel;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;

class AssetsInstallTest extends KernelTestCase
{
    protected static function getKernelClass()
    {
        return AppKernel::class;
    }

    public function testAssetsInstallProducesBundleAssets()
    {
        $target = sys_get_temp_dir().'/modal-bundle-assets-test-'.uniqid();
        @mkdir($target, 0777, true);

        $kernel = static::bootKernel();
        $application = new Application($kernel);
        $command = $application->find('assets:install');

        $tester = new CommandTester($command);
        $tester->execute([
            'target' => $target,
            '--symlink' => true,
        ]);

        $this->assertSame(0, $tester->getStatusCode());
        $this->assertFileExists($target.'/bundles/dyg81modal/js/scripts.js');
        $this->assertFileExists($target.'/bundles/dyg81modal/css/ajax-progress.css');
    }
}
