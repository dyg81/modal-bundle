<?php

namespace Dyg81\ModalBundle\Tests\Functional;

use Dyg81\ModalBundle\Tests\Fixtures\app\AppKernel;
use PHPUnit\Framework\TestCase;

class ContainerTest extends TestCase
{
    public function testContainerCompilesAndControllerIsReachable()
    {
        $kernel = new AppKernel('test', true);
        $kernel->boot();

        $container = $kernel->getContainer();
        $this->assertTrue($container->has('Dyg81\ModalBundle\Controller\ModalController'));
    }
}
